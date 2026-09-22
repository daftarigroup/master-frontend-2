import { uploadFile } from '@/lib/fetchers';

export async function uploadFileViaPresignedUrl(
  file: File,
  bucket = 'uploads',
  pathPrefix = 'files',
  _actAsTenantId?: string
): Promise<string> {
  return uploadFile({
    file,
    folderId: bucket,
    subFolder: pathPrefix,
  });
}

export default uploadFileViaPresignedUrl;

