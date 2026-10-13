import { useCallback, useState } from 'react';
import { putFileToS3 } from '@/lib/s3Upload';
import { documentsApi } from '../server/documentsApi';
import { useDocumentTypes } from '../server/useDocumentQueries';
import { downscaleImage } from './image';

export type WorkOrderFileKind = 'SERVICE_REPORT' | 'VENDOR_BILL' | 'MAINTENANCE_PHOTOS';

/**
 * The uploader for work-order, repair and outsourcing dialogs. It uses the SAME checked upload path as Equipment Documents (type, size,
 * permission and a per-firm, per-machine key) and returns the stored url the dialog sends with its work order. The server then registers
 * that file once as a document, so it appears in Equipment Documents without a second upload. Drop-in for the old `useImageUpload`.
 */
export function useWorkOrderUpload(machineId: string | undefined, kind: WorkOrderFileKind) {
  const types = useDocumentTypes(machineId, !!machineId);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadImage = useCallback(
    async (raw: File): Promise<{ url: string; path: string }> => {
      if (!machineId) throw new Error('Select a machine first');
      const type = types.data?.find((t) => t.code === kind);
      if (!type) throw new Error(types.isLoading ? 'Still loading, try again in a moment' : 'You cannot attach this kind of file to this machine');
      setIsUploading(true);
      setProgress(2);
      try {
        const file = await downscaleImage(raw);
        const [signed] = await documentsApi.presign({ machineId, documentTypeId: type.id, purpose: 'work_order', files: [{ name: file.name, mimeType: file.type, sizeBytes: file.size }] });
        await putFileToS3(signed.uploadUrl, file, signed.contentType, (p) => setProgress(Math.max(2, Math.round(p))));
        setProgress(100);
        return { url: signed.publicUrl, path: signed.key };
      } finally {
        setIsUploading(false);
      }
    },
    [machineId, kind, types.data, types.isLoading],
  );

  return { uploadImage, isUploading, progress };
}
