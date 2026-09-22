import { useCallback, useState } from 'react';
import { requestPresignedUrl, putFileToS3 } from '@/lib/s3Upload';
import { compressImageIfNeeded } from '@/lib/utils';

export interface UseImageUploadConfig {
  bucket?: string;
  pathPrefix?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  upsert?: boolean;
}

export interface UploadResult {
  url: string;
  mediaId: string;
  provider: string;
  path: string;
}

export interface UseImageUploadReturn {
  uploadImage: (file: File, customFileName?: string) => Promise<UploadResult>;
  isUploading: boolean;
  progress: number;
  error: string | null;
  resetError: () => void;
}

export function useImageUpload(config?: UseImageUploadConfig): UseImageUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const resetError = useCallback(() => setError(null), []);

  const uploadImage = useCallback(
    async (file: File, customFileName?: string): Promise<UploadResult> => {
      setIsUploading(true);
      setProgress(5);
      setError(null);

      try {
        if (config?.maxSizeMB && file.size > config.maxSizeMB * 1024 * 1024) {
          throw new Error(`File size exceeds maximum allowed size of ${config.maxSizeMB}MB`);
        }

        if (config?.allowedTypes && config.allowedTypes.length > 0) {
          const mime = file.type;
          const isAllowed = config.allowedTypes.some((type) => {
            if (type.endsWith('/*')) {
              return mime.startsWith(type.replace('/*', ''));
            }
            return mime === type;
          });
          if (!isAllowed) {
            throw new Error(`File type ${mime || 'unknown'} is not allowed`);
          }
        }

        // Compress eligible images
        const fileToUpload = file instanceof File ? await compressImageIfNeeded(file) : file;

        const bucket = config?.bucket || 'maintenance';
        const prefix = (config?.pathPrefix || 'uploads').replace(/^\/+|\/+$/g, '');
        const timestamp = Date.now();
        const baseName = (customFileName || fileToUpload.name).replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${prefix}/${timestamp}-${baseName}`;
        const contentType = fileToUpload.type || 'application/octet-stream';

        const presign = await requestPresignedUrl({
          bucket,
          path: storagePath,
          contentType,
        });

        if (!presign) {
          throw new Error('Unable to obtain presigned upload URL from server');
        }

        setProgress(20);

        await putFileToS3(presign.uploadUrl, fileToUpload, contentType, (percent) => {
          setProgress(Math.max(20, Math.round(percent)));
        });

        setProgress(100);
        setIsUploading(false);

        return {
          url: presign.publicUrl,
          mediaId: presign.key,
          provider: 's3',
          path: presign.key,
        };
      } catch (e: any) {
        setIsUploading(false);
        const errMsg = e?.message || 'Upload failed';
        setError(errMsg);
        throw e;
      }
    },
    [config?.bucket, config?.pathPrefix, config?.maxSizeMB, config?.allowedTypes]
  );

  return {
    uploadImage,
    isUploading,
    progress,
    error,
    resetError,
  };
}

export default useImageUpload;

