import { Upload, Pencil, X } from 'lucide-react';
import { PuffLoader as Loader } from 'react-spinners';
import { Progress } from '../ui/progress';
import type { AttachmentUploadStatus } from '@/hooks/useAttachmentUpload';

interface AttachmentUploadFieldProps {
    status: AttachmentUploadStatus;
    progress: number;
    fileName: string;
    error?: string;
    onSelect: (file: File) => void;
    
    onRemove: () => void;
    accept?: string;
    /** Unique id for the underlying <input>/<label> pair on the page. */
    id: string;
}

/**
 * Presentational half of the shared attachment-upload pattern — pair with
 * useAttachmentUpload() for the state machine. See
 * APP_DESIGN_LAYOUT_DOCUMENTATION.md for the full write-up.
 *
 * Renders: idle -> a clickable label prompting "Choose File"; uploading -> a
 * spinner + "Uploading… N%" + progress bar, input disabled; uploaded -> the
 * filename with a pencil icon (click to replace) plus a separate X button to
 * clear it outright; error -> reverts to the idle appearance with the error
 * message shown underneath.
 */
export function AttachmentUploadField({
    status,
    progress,
    fileName,
    error,
    onSelect,
    onRemove,
    accept = 'image/*,.pdf',
    id,
}: AttachmentUploadFieldProps) {
    const isUploading = status === 'uploading';
    const isUploaded = status === 'uploaded';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-selecting the same file
        if (file) onSelect(file);
    };

    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <label
                    htmlFor={id}
                    className={`flex-1 h-11 flex items-center gap-2 px-3 border rounded-md cursor-pointer ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
                >
                    {isUploading ? (
                        <Loader size={14} />
                    ) : isUploaded ? (
                        <Pencil size={14} className="text-primary shrink-0" />
                    ) : (
                        <Upload size={14} className="text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm truncate flex-1">
                        {isUploaded ? fileName : isUploading ? `Uploading… ${progress}%` : 'Choose File'}
                    </span>
                    <input
                        id={id}
                        type="file"
                        accept={accept}
                        className="sr-only"
                        disabled={isUploading}
                        onChange={handleChange}
                    />
                </label>
                {isUploaded && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="h-11 w-11 shrink-0 flex items-center justify-center rounded-md border text-muted-foreground hover:text-destructive hover:border-destructive/50"
                        title="Remove attachment"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
            {isUploading && <Progress value={progress} className="h-1.5" />}
            {status === 'error' && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export default AttachmentUploadField;
