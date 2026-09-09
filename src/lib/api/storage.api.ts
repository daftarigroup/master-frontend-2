/**
 * Storage API Adapter for HR module file operations
 */

export interface PresignedResult {
  uploadUrl: string;
  publicUrl: string;
  method: string;
  fields?: Record<string, string>;
  headers?: Record<string, string>;
  sessionId: string;
}

export async function uploadFileViaPresignedUrl(
  file: File,
  _folder?: any,
  _pathOrOptions?: any,
  _opt1?: any,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (typeof _opt1 === 'function') _opt1(100);
  if (onProgress) onProgress(100);
  return URL.createObjectURL(file);
}

export async function getPresignedUrl(
  _bucket?: string,
  _path?: string,
  _fileType?: string,
  _isPublic?: boolean
): Promise<PresignedResult> {
  const dummyId = `media-${Date.now()}`;
  return {
    uploadUrl: `https://mock-upload.local/${dummyId}`,
    publicUrl: `https://mock-public.local/${dummyId}`,
    method: 'PUT',
    fields: {},
    headers: { 'Content-Type': _fileType || 'application/octet-stream' },
    sessionId: `session-${Date.now()}`,
  };
}

export async function replaceStorageFile(
  _oldMediaOrFile: any,
  _bucket?: any,
  _path?: any,
  _fileType?: any,
  _isPublic?: any
): Promise<PresignedResult> {
  const dummyId = `media-${Date.now()}`;
  return {
    uploadUrl: `https://mock-upload.local/${dummyId}`,
    publicUrl: `https://mock-public.local/${dummyId}`,
    method: 'PUT',
    fields: {},
    headers: {},
    sessionId: `session-${Date.now()}`,
  };
}

export async function confirmUpload(_sessionId: string, _size?: number): Promise<{ mediaId: string; url: string; publicUrl: string }> {
  const id = `media-${Date.now()}`;
  const publicUrl = `https://mock-public.local/${id}`;
  return {
    mediaId: id,
    url: publicUrl,
    publicUrl,
  };
}

export async function deleteStorageFile(_target: any): Promise<void> {
  // Best effort mock
}
