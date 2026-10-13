import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { longDay } from '@/features/maintenancepro/records/lib/due';
import { cn } from '@/lib/utils';
import { openDocFile } from '../lib/openDocFile';
import { useDocumentDetail } from '../server/useDocumentQueries';
import type { DocRow } from '../types';

/** A photo set in a shadcn Dialog: one large photo with previous / next, a strip of thumbnails, and a download button per file. */
export function GalleryDialog({ doc, onClose }: { doc: DocRow | null; onClose: () => void }) {
  const q = useDocumentDetail(doc?.id);
  const files = q.data?.document.files ?? doc?.files ?? [];
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [doc?.id]);
  const current = files[Math.min(index, Math.max(files.length - 1, 0))];
  const go = (d: number) => setIndex((i) => (files.length ? (i + d + files.length) % files.length : 0));

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[92dvh] gap-3 overflow-y-auto sm:max-w-3xl"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(1);
          if (e.key === 'ArrowLeft') go(-1);
        }}
      >
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{doc?.title}</DialogTitle>
          <DialogDescription>{files.length} {files.length === 1 ? 'photo' : 'photos'}{doc ? ` · uploaded on ${longDay(doc.uploadedAt)}` : ''}</DialogDescription>
        </DialogHeader>
        {q.isLoading && !files.some((f) => f.previewUrl) ? (
          <Skeleton className="aspect-video w-full" />
        ) : current ? (
          <div className="relative grid aspect-video w-full place-items-center overflow-hidden rounded-lg border bg-muted">
            {current.previewUrl ? <img src={current.previewUrl} alt={current.originalName} className="size-full object-contain" /> : <ImageOff className="size-10 text-muted-foreground" aria-hidden />}
            {files.length > 1 && (
              <>
                <Button variant="secondary" size="icon" className="absolute left-2 top-1/2 size-11 -translate-y-1/2 rounded-full opacity-90" aria-label="Previous photo" onClick={() => go(-1)}><ChevronLeft className="size-5" /></Button>
                <Button variant="secondary" size="icon" className="absolute right-2 top-1/2 size-11 -translate-y-1/2 rounded-full opacity-90" aria-label="Next photo" onClick={() => go(1)}><ChevronRight className="size-5" /></Button>
              </>
            )}
          </div>
        ) : null}
        {current && (
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{index + 1} / {files.length} · {current.originalName}</p>
            <Button variant="outline" size="sm" className="h-10" onClick={() => void openDocFile(current.id, 'download')}><Download className="size-4" /> Download</Button>
          </div>
        )}
        {files.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1" role="list" aria-label="Photos">
            {files.map((f, i) => (
              <button key={f.id} type="button" role="listitem" onClick={() => setIndex(i)} aria-label={`Photo ${i + 1}`} aria-current={i === index} className={cn('size-14 shrink-0 overflow-hidden rounded-md border-2 bg-muted', i === index ? 'border-primary' : 'border-transparent')}>
                {f.previewUrl ? <img src={f.previewUrl} alt="" loading="lazy" className="size-full object-cover" /> : <ImageOff className="m-auto size-4 text-muted-foreground" aria-hidden />}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
