import { apiClient } from '@/lib/apiClient';

/**
 * Direct-to-S3 presigned upload primitives. Used by uploadFile() in
 * lib/fetchers.ts. There is intentionally no fallback path anywhere in this
 * chain — if a presigned URL can't be obtained, or the direct PUT to S3
 * fails, the upload fails outright. Nothing is ever proxied through the
 * server or written to local disk.
 */

interface PresignResult {
    uploadUrl: string;
    key: string;
    publicUrl: string;
}

/**
 * Asks the backend for a time-limited URL the browser can PUT a file to
 * directly. Never throws itself — returns null on any failure (S3 not
 * configured on the backend, network error, unexpected response shape) so
 * the caller (uploadFile in lib/fetchers.ts) can turn it into one clear,
 * user-facing error instead of a raw axios error.
 */
export async function requestPresignedUrl(params: {
    bucket: string;
    path: string;
    contentType: string;
}): Promise<PresignResult | null> {
    try {
        const res: any = await apiClient.post('/store/upload/presign', params);
        const data = res?.data;
        if (!data?.uploadUrl || !data?.publicUrl || !data?.key) return null;
        return { uploadUrl: data.uploadUrl, key: data.key, publicUrl: data.publicUrl };
    } catch (error: any) {
        console.warn('Presigned upload request failed — no fallback, upload will fail:', error?.message || error);
        return null;
    }
}

/**
 * Deletes a previously-uploaded S3 object, given its public URL (or bare
 * key). Best-effort housekeeping — never throws, so a failed cleanup never
 * blocks or fails the user-facing remove/replace/close action that
 * triggered it. Any failure just leaves an orphan behind, same as today.
 */
export async function deleteUploadedFile(urlOrKey: string): Promise<void> {
    try {
        await apiClient.delete('/store/upload', { data: { url: urlOrKey } });
    } catch (error: any) {
        console.warn('Failed to delete S3 object (non-fatal, an orphan may be left behind):', error?.message || error);
    }
}

/**
 * PUTs a file directly to S3 using a presigned URL. Built on XMLHttpRequest
 * (not fetch, which cannot report upload progress) so callers can show a
 * real percentage. Note this presigned URL only signs the `host` header
 * (X-Amz-SignedHeaders=host) — Content-Type isn't cryptographically bound to
 * the signature here, so a mismatch won't itself cause SignatureDoesNotMatch;
 * it's still sent to match what the backend recorded when presigning.
 */

export function putFileToS3(
    uploadUrl: string,
    file: File,
    contentType: string,
    onProgress?: (percent: number) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', contentType);

        if (onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                // S3 error responses are a small XML body with the real
                // <Code>/<Message> (e.g. AccessDenied, RequestTimeTooSkewed,
                // SignatureDoesNotMatch) — surface it instead of just the
                // HTTP status, which alone isn't enough to diagnose a 403.
                let detail = '';
                try {
                    const doc = new DOMParser().parseFromString(xhr.responseText, 'application/xml');
                    const code = doc.querySelector('Code')?.textContent;
                    const message = doc.querySelector('Message')?.textContent;
                    if (code || message) detail = ` — ${code || ''}${message ? `: ${message}` : ''}`;
                } catch {
                    // Malformed/non-XML body — fall back to the bare status.
                }
                reject(new Error(`S3 upload failed with status ${xhr.status}${detail}`));
            }
        };
        xhr.onerror = () => reject(new Error('S3 upload failed (network error) — check the S3 bucket CORS policy allows PUT from this origin.'));
        xhr.send(file);
    });
}
