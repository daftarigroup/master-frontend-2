import { useCallback, useState } from 'react';
import { toast } from 'sonner';

/**
 * Wraps any uploadFile(...)-shaped call with a percentage-driven toast
 * (reusing the app's existing toast.loading -> update-by-id -> success/error
 * pattern, e.g. AllDocuments.tsx) so form-embedded upload sites get visible
 * progress feedback without redesigning the form's layout or submit-gating
 * logic. GetLift.tsx uses its own inline <Progress> bar instead (it already
 * has dedicated per-item upload state) — this hook is for everywhere else.
 */
export function useFileUpload() {
    const [progress, setProgress] = useState<number | null>(null);

    const runWithProgress = useCallback(
        async <T,>(uploadFn: (onProgress: (percent: number) => void) => Promise<T>, label = 'Uploading'): Promise<T> => {
            const toastId = toast.loading(`${label}… 0%`);
            setProgress(0);
            try {
                const result = await uploadFn((percent) => {
                    setProgress(percent);
                    toast.loading(`${label}… ${percent}%`, { id: toastId });
                });
                toast.success(`${label} complete`, { id: toastId });
                return result;
            } catch (error) {
                toast.error(`${label} failed`, { id: toastId });
                throw error;
            } finally {
                setProgress(null);
            }
        },
        []
    );

    return { runWithProgress, progress };
}
