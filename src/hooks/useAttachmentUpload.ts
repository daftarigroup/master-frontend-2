import { useCallback, useRef, useState } from 'react';
import { deleteUploadedFile } from '@/lib/s3Upload';

export type AttachmentUploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

export interface AttachmentUploadState {
    status: AttachmentUploadStatus;
    progress: number;
    url: string;
    fileName: string;
    error?: string;
}

const IDLE_STATE: AttachmentUploadState = { status: 'idle', progress: 0, url: '', fileName: '' };

/**
 * Drives the "upload immediately on select, show progress, allow remove/
 * replace" pattern used across the app's file-attachment fields — pair this
 * with <AttachmentUploadField> rather than re-deriving the state machine.
 * See APP_DESIGN_LAYOUT_DOCUMENTATION.md for the full write-up of why this
 * exists and the pitfalls (reset synchronization, Zod schema shape) it solves.
 *
 * Also owns S3 cleanup: replacing a file deletes the one it replaced, and
 * remove()/reset() delete the currently-uploaded object unless it was
 * already committed (persisted to a saved record) — see reset()'s doc.
 *
 * @param uploadFn One of the storeInService.ts/getLiftService.ts-style upload
 *   functions: (file, id, onProgress?) => Promise<string>. The `id` middle
 *   parameter is dead in every current implementation (kept only for
 *   call-site signature stability) — this hook always passes ''.
 */
export function useAttachmentUpload(
    uploadFn: (file: File, id: string, onProgress?: (percent: number) => void) => Promise<string>
) {
    const [state, setState] = useState<AttachmentUploadState>(IDLE_STATE);
    // Mirrors `state` for use inside callbacks without making them depend on
    // (and get recreated on) every state change.
    const stateRef = useRef(state);
    stateRef.current = state;
    // Guards against a stale upload's success/failure landing after a newer
    // select() or reset() already moved the field on (e.g. rapid re-selects,
    // or the dialog closing mid-upload).
    const requestIdRef = useRef(0);

    const select = useCallback(
        async (file: File): Promise<string | null> => {
            const requestId = ++requestIdRef.current;
            const previousUrl = stateRef.current.status === 'uploaded' ? stateRef.current.url : null;
            setState({ status: 'uploading', progress: 0, url: '', fileName: file.name });

            try {
                const url = await uploadFn(file, '', (percent) => {
                    if (requestIdRef.current !== requestId) return;
                    setState((prev) => ({ ...prev, progress: percent }));
                });
                if (requestIdRef.current !== requestId) {
                    // Superseded (removed/reset/re-selected) while this upload
                    // was still in flight — nothing will ever reference the
                    // object it just finished uploading, clean it up.
                    deleteUploadedFile(url);
                    return null;
                }
                setState({ status: 'uploaded', progress: 100, url, fileName: file.name });
                // A replacement file was chosen — the old object is no longer
                // referenced by anything, clean it up (fire-and-forget).
                if (previousUrl) deleteUploadedFile(previousUrl);
                return url;
            } catch (error) {
                if (requestIdRef.current !== requestId) return null;
                const message = error instanceof Error ? error.message : 'Upload failed. Please try again.';
                setState({ status: 'error', progress: 0, url: '', fileName: '', error: message });
                return null;
            }
        },
        [uploadFn]
    );

    // Explicit "throw this away" action (the X button) — always deletes an
    // already-uploaded object, no ambiguity about whether it's still wanted.
    const remove = useCallback(() => {
        requestIdRef.current += 1; // invalidate any in-flight upload
        if (stateRef.current.status === 'uploaded' && stateRef.current.url) {
            deleteUploadedFile(stateRef.current.url);
        }
        setState(IDLE_STATE);
    }, []);

    // Clears the field back to idle. By default also deletes an
    // already-uploaded object, since reset() is normally called when a
    // dialog/form is closing or being reopened for a different record and
    // an uploaded-but-never-saved file is about to become an orphan.
    // Callers MUST pass { committed: true } right after a successful submit
    // that has just persisted this exact URL to a record — that file is now
    // live and must not be deleted.
    const reset = useCallback((opts?: { committed?: boolean }) => {
        requestIdRef.current += 1;
        if (!opts?.committed && stateRef.current.status === 'uploaded' && stateRef.current.url) {
            deleteUploadedFile(stateRef.current.url);
        }
        setState(IDLE_STATE);
    }, []);

    return { ...state, select, remove, reset };
}
