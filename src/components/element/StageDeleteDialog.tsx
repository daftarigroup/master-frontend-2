import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, RotateCcw } from 'lucide-react';
import { ClipLoader } from 'react-spinners';

interface StageDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    indentNumber?: string;
    productName?: string;
    stageName: string;
    isPermanentDelete?: boolean;
    customMessage?: string;
    onConfirm: () => Promise<void>;
}

export const StageDeleteDialog: React.FC<StageDeleteDialogProps> = ({
    open,
    onOpenChange,
    title,
    indentNumber,
    productName,
    stageName,
    isPermanentDelete = false,
    customMessage,
    onConfirm,
}) => {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } catch (error) {
            console.error('Error during delete action:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
            <DialogContent className="sm:max-w-md p-5">
                <DialogHeader className="flex flex-row items-start gap-3 space-y-0 text-left">
                    <div className={`p-2.5 rounded-full ${isPermanentDelete ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'} shrink-0 mt-0.5`}>
                        {isPermanentDelete ? <Trash2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 space-y-1">
                        <DialogTitle className="text-base font-semibold text-foreground">
                            {title || (isPermanentDelete ? 'Delete Indent' : `Delete ${stageName} Data`)}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                            {customMessage ? (
                                customMessage
                            ) : isPermanentDelete ? (
                                <>
                                    Are you sure you want to permanently delete Indent{' '}
                                    <span className="font-semibold text-foreground">{indentNumber}</span>
                                    {productName ? ` (${productName})` : ''}? This action{' '}
                                    <span className="font-semibold text-red-600 dark:text-red-400">cannot be undone</span>.
                                </>
                            ) : (
                                <>
                                    Are you sure you want to delete <span className="font-semibold text-foreground">{stageName}</span> details for Indent{' '}
                                    <span className="font-semibold text-foreground">{indentNumber}</span>
                                    {productName ? ` (${productName})` : ''}?
                                    <span className="block mt-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                                        ⚠️ This will clear this stage and all subsequent stages, moving the indent back to the pending queue for {stageName}. Previous stage data will remain intact.
                                    </span>
                                </>
                            )}
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" size="sm" disabled={loading} className="h-8 px-3 text-xs">
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        variant={isPermanentDelete ? 'destructive' : 'default'}
                        size="sm"
                        disabled={loading}
                        onClick={handleConfirm}
                        className={`h-8 px-3 text-xs gap-1.5 ${!isPermanentDelete ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                    >
                        {loading ? (
                            <ClipLoader size={12} color="currentColor" />
                        ) : isPermanentDelete ? (
                            <Trash2 className="h-3.5 w-3.5" />
                        ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        {loading ? 'Processing...' : isPermanentDelete ? 'Delete Indent' : 'Reset Stage'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default StageDeleteDialog;
