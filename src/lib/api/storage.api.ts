import { requestPresignedUrl, putFileToS3, deleteUploadedFile } from '@/lib/s3Upload';
import { compressImageIfNeeded } from '@/lib/utils';

/**
 * Storage API Adapter for HR module file operations.
 * Connects directly to the backend AWS S3 presigned upload pipeline,
 * organizing all HR uploads under a dedicated 'hr/' S3 prefix.
 */

export interface PresignedResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  method: string;
  fields?: Record<string, string>;
  headers?: Record<string, string>;
  sessionId: string;
}

/**
 * Uploads a file directly to AWS S3 using presigned PUT URLs.
 * Stores files under: "hr/<subFolder>/<timestamp>-<filename>"
 */
export async function uploadFileViaPresignedUrl(
  file: File,
  _folder = 'hr',
  subFolder = 'uploads',
  _opt1?: any,
  onProgress?: (percent: number) => void
): Promise<string> {
  const progressCb = typeof _opt1 === 'function' ? _opt1 : onProgress;
  
  // Compress images if eligible
  const fileToUpload = file instanceof File ? await compressImageIfNeeded(file) : file;

  // Determine subfolder path under hr/
  // Handle various caller patterns:
  // - uploadFileViaPresignedUrl(file, 'hr', 'candidates/photos')
  // - uploadFileViaPresignedUrl(file, 'uploads', 'candidates/photos')
  // - uploadFileViaPresignedUrl(file, 'candidates/photos')
  let cleanSub = '';
  if (subFolder && subFolder !== 'uploads') {
    cleanSub = subFolder.replace(/^\/+|\/+$/g, '');
  } else if (_folder && _folder !== 'hr' && _folder !== 'uploads') {
    cleanSub = _folder.replace(/^\/+|\/+$/g, '');
  } else {
    cleanSub = 'uploads';
  }

  // Strip leading 'hr/' if caller included it, so we don't end up with hr/hr/
  cleanSub = cleanSub.replace(/^hr\//, '').replace(/^uploads\//, '');

  const timestamp = Date.now();
  const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = cleanSub ? `${cleanSub}/${timestamp}-${safeName}` : `${timestamp}-${safeName}`;
  const contentType = fileToUpload.type || 'application/octet-stream';

  const presign = await requestPresignedUrl({
    bucket: 'hr',
    path,
    contentType,
  });

  if (!presign) {
    throw new Error('Direct-to-S3 upload failed: unable to obtain presigned URL from server.');
  }

  await putFileToS3(presign.uploadUrl, fileToUpload, contentType, progressCb);
  return presign.publicUrl;
}

/**
 * Generates a presigned PUT URL for custom uploaders (e.g. DocVerificationModal in Find Enquiry).
 */
export async function getPresignedUrl(
  _bucket = 'hr',
  path = '',
  fileType = 'application/octet-stream',
  _isPublic = true
): Promise<PresignedResult> {
  let cleanPath = path.replace(/^\/+/, '');
  if (cleanPath.startsWith('uploads/')) {
    cleanPath = cleanPath.replace(/^uploads\//, '');
  }
  if (cleanPath.startsWith('hr/')) {
    cleanPath = cleanPath.replace(/^hr\//, '');
  }

  const presign = await requestPresignedUrl({
    bucket: 'hr',
    path: cleanPath,
    contentType: fileType,
  });

  if (!presign) {
    throw new Error('Direct-to-S3 upload failed: unable to obtain presigned URL from server.');
  }

  return {
    uploadUrl: presign.uploadUrl,
    publicUrl: presign.publicUrl,
    key: presign.key,
    method: 'PUT',
    fields: {},
    headers: { 'Content-Type': fileType },
    sessionId: presign.publicUrl,
  };
}

export async function replaceStorageFile(
  oldMediaOrFile: any,
  bucket = 'hr',
  path = '',
  fileType = 'application/octet-stream',
  isPublic = true
): Promise<PresignedResult> {
  if (oldMediaOrFile) {
    deleteUploadedFile(oldMediaOrFile).catch(() => {});
  }
  return getPresignedUrl(bucket, path, fileType, isPublic);
}

export async function confirmUpload(
  sessionId: string,
  _size?: number
): Promise<{ mediaId: string; url: string; publicUrl: string }> {
  // sessionId contains the generated public S3 URL
  return {
    mediaId: sessionId,
    url: sessionId,
    publicUrl: sessionId,
  };
}

export async function deleteStorageFile(target: any): Promise<void> {
  const urlOrKey = typeof target === 'string' ? target : target?.mediaId || target?.url || '';
  if (urlOrKey) {
    await deleteUploadedFile(urlOrKey);
  }
}

