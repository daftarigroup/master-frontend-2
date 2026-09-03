import React from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploadFieldProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imagePreview: string | null;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  label: string;
  isUploading?: boolean;
  uploadProgress?: number;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  fileInputRef,
  imagePreview,
  onSelect,
  onClear,
  label,
  isUploading = false,
  uploadProgress = 0,
}) => {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground/80 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          ref={fileInputRef as any}
          type="file"
          accept="image/*"
          onChange={onSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full border border-dashed border-input rounded-lg p-2.5 hover:border-primary/50 hover:bg-accent/40 transition flex flex-col items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Upload className="text-muted-foreground mb-1 size-5" />
          <span className="text-xs font-medium text-muted-foreground">
            {isUploading ? `Uploading… ${uploadProgress}%` : 'Click to upload image'}
          </span>
        </button>

        {isUploading && (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {imagePreview && (
          <div className="mt-2">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-20 w-20 object-cover rounded-md border border-border shadow-xs"
              />
              <button
                type="button"
                onClick={onClear}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90 shadow-xs"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploadField;
