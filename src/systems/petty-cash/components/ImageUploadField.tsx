import React from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploadFieldProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imagePreview: string | null;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  label: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  fileInputRef,
  imagePreview,
  onSelect,
  onClear,
  label,
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
          className="w-full border border-dashed border-input rounded-lg p-2.5 hover:border-primary/50 hover:bg-accent/40 transition flex flex-col items-center justify-center cursor-pointer"
        >
          <Upload className="text-muted-foreground mb-1 size-5" />
          <span className="text-xs font-medium text-muted-foreground">
            Click to upload image
          </span>
        </button>

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
