import { compressImageIfNeeded } from '@/lib/utils';
import { requestPresignedUrl, putFileToS3 } from '@/lib/s3Upload';

/**
 * Uploads a file directly to S3 from the browser via a presigned URL — no
 * file bytes ever pass through the Node server, and nothing is ever written
 * to local disk. There is deliberately NO fallback path: if a presigned URL
 * can't be obtained (S3 not configured on the backend, network error, etc.)
 * or the direct PUT to S3 fails, this throws immediately instead of quietly
 * degrading to a server-buffered or local-disk upload. That silent
 * degradation is exactly what caused uploaded files to vanish in the past
 * (saved to one server instance's local disk, gone after the next
 * redeploy/restart) — failing loudly here surfaces the real problem instead.
 *
 * @param file        - The File object to upload.
 * @param folderId    - Logical "bucket"/feature name (e.g. "purchase-attachments",
 *                      "bill_image_status", "checklist"). The backend nests every
 *                      upload's key under a shared "bill_image_status/" root,
 *                      with this value as the subdirectory beneath it.
 * @param subFolder   - Target folder within folderId.
 * @param onProgress  - Optional 0-100 upload progress callback.
 * @param uploadType  - Kept for API compatibility; unused.
 * @param email       - Kept for API compatibility; unused.
 * @param emailSubject - Kept for API compatibility; unused.
 * @param emailBody   - Kept for API compatibility; unused.
 * @returns The public S3 URL of the uploaded file.
 */
export async function uploadFile({
    file,
    folderId,
    subFolder,
    onProgress,
    uploadType = 'upload',
    email,
    emailSubject,
    emailBody,
}: {
    file: File;
    folderId: string;
    subFolder?: string; // Target folder within the bucket
    onProgress?: (percent: number) => void;
    uploadType?: 'upload' | 'email';
    email?: string;
    emailSubject?: string;
    emailBody?: string;
}): Promise<string> {
    // Suppress unused-variable warnings for legacy params
    void uploadType;
    void email;
    void emailSubject;
    void emailBody;

    // Compress images before upload — same as the previous Supabase-shim
    // implementation, preserved here since callers rely on this happening.
    const fileToUpload = file instanceof File ? await compressImageIfNeeded(file) : file;

    // Build a unique storage path: [subFolder/]<timestamp>-<sanitised-filename>
    const timestamp = Date.now();
    const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}-${safeName}`;
    const storagePath = subFolder ? `${subFolder}/${fileName}` : fileName;
    const contentType = fileToUpload.type || 'application/octet-stream';

    const presign = await requestPresignedUrl({ bucket: folderId, path: storagePath, contentType });
    if (!presign) {
        throw new Error(
            'Direct-to-S3 upload is unavailable right now (S3 is not configured on the server, or the upload request failed). No fallback is used, so the file was not saved — please try again shortly.'
        );
    }

    await putFileToS3(presign.uploadUrl, fileToUpload, contentType, onProgress);
    return presign.publicUrl;
}
