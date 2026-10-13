import { useCallback, useRef, useState } from 'react';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import { putFileToS3 } from '@/lib/s3Upload';
import { documentsApi, type PresignBody } from '../server/documentsApi';
import type { FileRef } from '../types';
import { downscaleImage } from './image';

export interface UploadItem {
  id: string;
  file: File;
  /** an object URL for image previews */
  preview: string | null;
  status: 'queued' | 'uploading' | 'done' | 'error';
  /** wrong type or too large: it can only be removed, not retried */
  invalid: boolean;
  progress: number;
  error: string | null;
  key: string | null;
}

export type UploadOwner = Omit<PresignBody, 'files'>;

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
export const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,image/*,application/pdf';
export const MAX_MB = 10;

/**
 * The one uploader for documents. Files are added to a queue (photos are downscaled first), then `upload(target)` asks the server for
 * short-lived upload links (the server checks type, size and permission), PUTs each file straight to storage with progress, and
 * returns the file references to save. A failed file keeps its place and can be retried without re-sending the ones that worked.
 */
export function useDocumentUpload() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef<UploadItem[]>([]);
  const set = useCallback((next: UploadItem[] | ((p: UploadItem[]) => UploadItem[])) => {
    setItems((prev) => {
      const v = typeof next === 'function' ? next(prev) : next;
      itemsRef.current = v;
      return v;
    });
  }, []);
  const patch = useCallback((id: string, p: Partial<UploadItem>) => set((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i))), [set]);

  const addFiles = useCallback(
    async (files: File[], opts: { single?: boolean; max?: number } = {}) => {
      const next: UploadItem[] = [];
      for (const raw of files) {
        const problem = !ALLOWED_MIME.includes(raw.type) ? `"${raw.name}" is not a PDF, photo, Word or Excel file` : raw.size > MAX_MB * 1024 * 1024 * 3 ? `"${raw.name}" is too large (limit ${MAX_MB} MB)` : null;
        const file = problem ? raw : await downscaleImage(raw);
        const tooBig = !problem && file.size > MAX_MB * 1024 * 1024;
        next.push({
          id: crypto.randomUUID(), file, preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
          invalid: Boolean(problem) || tooBig, status: problem || tooBig ? 'error' : 'queued', progress: 0, error: problem ?? (tooBig ? `"${file.name}" is larger than ${MAX_MB} MB` : null), key: null,
        });
      }
      set((prev) => {
        const merged = opts.single ? next.slice(0, 1) : [...prev, ...next];
        return merged.slice(0, opts.max ?? 20);
      });
    },
    [set],
  );

  const remove = useCallback((id: string) => set((prev) => prev.filter((i) => i.id !== id)), [set]);
  const clear = useCallback(() => set([]), [set]);

  /** Uploads whatever is not done yet. Resolves with every file's reference; rejects with a message if any file failed (retry calls this again). */
  const upload = useCallback(
    async (target: UploadOwner): Promise<FileRef[]> => {
      const todo = itemsRef.current.filter((i) => i.status !== 'done');
      if (itemsRef.current.length === 0) throw new Error('Add at least one file');
      if (todo.some((i) => i.invalid)) throw new Error('Remove the files that cannot be uploaded first');
      if (todo.length > 0) {
        todo.forEach((i) => patch(i.id, { status: 'uploading', progress: 2, error: null }));
        let signed;
        try {
          signed = await documentsApi.presign({ ...target, files: todo.map((i) => ({ name: i.file.name, mimeType: i.file.type, sizeBytes: i.file.size })) });
        } catch (e) {
          const msg = apiErrorMessage(e, 'Could not start the upload');
          todo.forEach((i) => patch(i.id, { status: 'error', error: msg }));
          throw new Error(msg);
        }
        await Promise.all(
          todo.map(async (item, idx) => {
            const s = signed[idx];
            try {
              await putFileToS3(s.uploadUrl, item.file, s.contentType, (pct) => patch(item.id, { progress: Math.max(2, Math.round(pct)) }));
              patch(item.id, { status: 'done', progress: 100, key: s.key });
            } catch (e) {
              patch(item.id, { status: 'error', error: e instanceof Error ? e.message : 'Upload failed' });
            }
          }),
        );
      }
      const after = itemsRef.current;
      if (after.some((i) => i.status !== 'done')) throw new Error('Some files did not upload. Tap Retry on them.');
      return after.map((i) => ({ key: i.key as string, originalName: i.file.name, mimeType: i.file.type, sizeBytes: i.file.size }));
    },
    [patch],
  );

  const busy = items.some((i) => i.status === 'uploading');
  return { items, addFiles, remove, clear, upload, busy };
}
