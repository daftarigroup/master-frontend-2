import { useState, useEffect, useMemo, type ReactNode } from 'react';
import {
    ImageIcon,
    Volume2,
    Download,
    ExternalLink,
    FileQuestion,
    X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn, getPublicFileUrl } from '@/lib/utils';

interface MediaPreviewDialogProps {
    imageUrl?: string | null;
    audioUrl?: string | null;
    title?: string;
    trigger?: ReactNode;
    className?: string;
}

export default function MediaPreviewDialog({
    imageUrl,
    audioUrl,
    title = 'Attachment Preview',
    trigger,
    className,
}: MediaPreviewDialogProps) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'image' | 'audio'>('image');
    const [imgError, setImgError] = useState(false);

    const resolvedImageUrl = useMemo(() => getPublicFileUrl(imageUrl), [imageUrl]);
    const resolvedAudioUrl = useMemo(() => getPublicFileUrl(audioUrl), [audioUrl]);

    const hasImage = Boolean(resolvedImageUrl && resolvedImageUrl.trim().length > 0);
    const hasAudio = Boolean(resolvedAudioUrl && resolvedAudioUrl.trim().length > 0);

    useEffect(() => {
        if (open) {
            setImgError(false);
            if (hasImage) setActiveTab('image');
            else if (hasAudio) setActiveTab('audio');
        }
    }, [open, hasImage, hasAudio]);

    if (!hasImage && !hasAudio) return null;

    return (
        <>
            {trigger ? (
                <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
                    {trigger}
                </div>
            ) : (
                <div className={cn('flex items-center gap-1.5', className)}>
                    {hasImage && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setOpen(true)}
                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground font-medium px-2 rounded-lg"
                        >
                            <ImageIcon size={13} /> Photo
                        </Button>
                    )}
                    {hasAudio && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setOpen(true)}
                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground font-medium px-2 rounded-lg"
                        >
                            <Volume2 size={13} /> Voice Note
                        </Button>
                    )}
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border border-border/60 shadow-xl bg-card text-left gap-0">
                    {/* Minimalist Top Header */}
                    <DialogHeader className="px-4 py-3.5 border-b border-border/40 flex flex-row items-center justify-between bg-muted/20 space-y-0">
                        <DialogTitle className="text-xs font-semibold tracking-tight text-foreground/90">
                            {title}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Preview photo and voice note proof attachments for this task.
                        </DialogDescription>
                        {hasImage && hasAudio && (
                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
                                <TabsList className="h-7 bg-muted/80 p-0.5 rounded-lg">
                                    <TabsTrigger value="image" className="text-[11px] h-6 px-2.5 rounded-md font-semibold data-[state=active]:bg-background data-[state=active]:shadow-2xs">
                                        Photo
                                    </TabsTrigger>
                                    <TabsTrigger value="audio" className="text-[11px] h-6 px-2.5 rounded-md font-semibold data-[state=active]:bg-background data-[state=active]:shadow-2xs">
                                        Audio
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}
                    </DialogHeader>

                    {/* Minimal Media Container */}
                    <div className="p-4 bg-background">
                        {hasImage && hasAudio ? (
                            <Tabs value={activeTab} className="w-full">
                                <TabsContent value="image" className="mt-0">
                                    <MinimalImagePreview imageUrl={resolvedImageUrl} imgError={imgError} setImgError={setImgError} />
                                </TabsContent>
                                <TabsContent value="audio" className="mt-0">
                                    <MinimalAudioPreview audioUrl={resolvedAudioUrl} />
                                </TabsContent>
                            </Tabs>
                        ) : hasImage ? (
                            <MinimalImagePreview imageUrl={resolvedImageUrl} imgError={imgError} setImgError={setImgError} />
                        ) : (
                            <MinimalAudioPreview audioUrl={resolvedAudioUrl} />
                        )}
                    </div>

                    {/* Minimal Footer Toolbar */}
                    <div className="px-4 py-2.5 border-t border-border/40 bg-muted/10 flex items-center justify-between">
                        <div>
                            {hasImage && activeTab === 'image' && resolvedImageUrl && !imgError && (
                                <a
                                    href={resolvedImageUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ExternalLink size={12} /> Open original
                                </a>
                            )}
                            {hasAudio && activeTab === 'audio' && resolvedAudioUrl && (
                                <a
                                    href={resolvedAudioUrl}
                                    download
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Download size={12} /> Download file
                                </a>
                            )}
                        </div>

                        <DialogClose asChild>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-3 rounded-lg font-medium">
                                Close
                            </Button>
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

/** Minimalist Image Box */
function MinimalImagePreview({
    imageUrl,
    imgError,
    setImgError,
}: {
    imageUrl: string;
    imgError: boolean;
    setImgError: (err: boolean) => void;
}) {
    if (imgError) {
        return (
            <div className="rounded-xl border border-dashed border-border/60 p-8 bg-muted/20 flex flex-col items-center justify-center text-center space-y-1.5 min-h-[200px]">
                <FileQuestion size={24} className="text-muted-foreground/50" />
                <p className="text-xs font-semibold text-foreground">Attachment Unavailable</p>
                <p className="text-[11px] text-muted-foreground">The image file could not be loaded.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-border/40 overflow-hidden flex items-center justify-center min-h-[220px] max-h-[60vh] p-2">
            <img
                src={imageUrl}
                alt="Proof attachment"
                onError={() => setImgError(true)}
                className="max-h-[55vh] w-auto object-contain rounded-lg shadow-2xs"
            />
        </div>
    );
}

/** Minimalist Audio Box */
function MinimalAudioPreview({ audioUrl }: { audioUrl: string }) {
    return (
        <div className="rounded-xl border border-border/40 p-4 bg-muted/20 space-y-2 text-left">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Volume2 size={15} className="text-muted-foreground" />
                <span>Voice Note Playback</span>
            </div>
            <audio src={audioUrl} controls autoPlay className="w-full h-9 rounded-lg" />
        </div>
    );
}
