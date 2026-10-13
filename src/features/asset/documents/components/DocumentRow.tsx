import { ImageOff } from 'lucide-react';
import { StatusPill } from '@/features/asset/equipment/components/StatusPill';
import { longDay } from '@/features/maintenancepro/records/lib/due';
import { cn } from '@/lib/utils';
import { VALID_TILL_COLOUR, fileLabel, hasValidity, iconFor, pillStatus, toneFor } from '../lib/docUi';
import { openDocFile } from '../lib/openDocFile';
import type { DocRow } from '../types';
import { DocumentActions } from './DocumentActions';

/** The file name as a link: opens the first file (or the detail for a set). Plain text, never HTML. */
function FileLink({ doc, onOpen }: { doc: DocRow; onOpen: (d: DocRow) => void }) {
  const first = doc.files[0];
  if (!first) return <span className="text-xs text-muted-foreground">No file</span>;
  const single = doc.fileCount === 1;
  return (
    <button
      type="button"
      className="block max-w-full truncate text-left text-xs font-medium text-primary hover:underline"
      onClick={(e) => {
        e.stopPropagation();
        if (single) void openDocFile(first.id);
        else onOpen(doc);
      }}
    >
      {fileLabel(doc)}
    </button>
  );
}

interface RowProps {
  doc: DocRow;
  onOpen: (d: DocRow) => void;
  onGallery: (d: DocRow) => void;
  onRenew: (d: DocRow) => void;
  onEdit: (d: DocRow) => void;
  onReplace: (d: DocRow) => void;
  onAddFiles: (d: DocRow) => void;
  onVoid: (d: DocRow) => void;
  /** show the machine name (the fleet register) */
  withMachine?: boolean;
  /** optional columns the person switched off (the column picker); without it they show by screen width */
  hide?: ReadonlySet<OptionalColumn>;
}

export type OptionalColumn = 'number' | 'issuer' | 'uploaded' | 'workOrder';
const vis = (hide: ReadonlySet<OptionalColumn> | undefined, key: OptionalColumn, responsive: string) => (hide ? (hide.has(key) ? 'hidden' : 'table-cell') : responsive);

/** A photo set: three thumbnails and "+n". Tapping opens the gallery. */
function Thumbs({ doc, onGallery }: { doc: DocRow; onGallery: (d: DocRow) => void }) {
  const shown = doc.files.slice(0, 3);
  const more = doc.fileCount - shown.length;
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onGallery(doc); }} aria-label={`Open ${doc.fileCount} photos`} className="flex shrink-0 items-center gap-1">
      {shown.map((f) =>
        f.previewUrl ? (
          <img key={f.id} src={f.previewUrl} alt="" loading="lazy" className="size-10 rounded-md border object-cover" />
        ) : (
          <span key={f.id} className="grid size-10 place-items-center rounded-md border bg-muted text-muted-foreground"><ImageOff className="size-4" aria-hidden /></span>
        ),
      )}
      {more > 0 && <span className="grid size-10 place-items-center rounded-md border bg-muted text-xs font-semibold text-muted-foreground">+{more}</span>}
    </button>
  );
}

/** Phone row, as in the mockup: icon, title, file link, uploaded on; Valid Till and the status pill on the right; kebab. */
export function DocumentCard(p: RowProps) {
  const { doc } = p;
  const Icon = iconFor(doc);
  const pill = pillStatus(doc);
  const set = doc.type.allowMultipleFiles && doc.fileCount > 1;
  const validity = hasValidity(doc);
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => p.onOpen(doc)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.onOpen(doc); } }}
        className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 shadow-xs transition-colors hover:border-primary/40"
      >
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', toneFor(doc))}><Icon className="size-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-sm font-semibold leading-snug">{doc.title}</p>
          {p.withMachine && doc.machine && <p className="truncate text-xs text-muted-foreground">{doc.machine.name} · {doc.machine.assetCode}</p>}
          {set ? <p className="text-xs text-muted-foreground">{doc.fileCount} Photos</p> : <FileLink doc={doc} onOpen={p.onOpen} />}
          <p className="mt-0.5 text-[11px] text-muted-foreground">Uploaded on {longDay(doc.uploadedAt)}</p>
          {set && <div className="mt-2"><Thumbs doc={doc} onGallery={p.onGallery} /></div>}
        </div>
        {!set && (
          <div className="flex max-w-[7.25rem] shrink-0 flex-col items-end gap-1 text-right">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{validity ? 'Valid Till' : 'Date'}</span>
            <span className={cn('whitespace-nowrap text-[13px] font-semibold', validity ? VALID_TILL_COLOUR[doc.status] : 'text-foreground')}>{longDay(validity ? doc.validTill : (doc.issuedAt ?? doc.uploadedAt))}</span>
            {validity && doc.validTill && <span className="text-[10px] leading-tight text-muted-foreground">{doc.statusLabel}</span>}
            {pill && <StatusPill status={pill} />}
          </div>
        )}
        <DocumentActions {...p} />
      </div>
    </li>
  );
}

/** The same row on desktop: a table row. Columns that need room show from xl / 2xl up. */
export function DocumentTableRow(p: RowProps) {
  const { doc } = p;
  const Icon = iconFor(doc);
  const pill = pillStatus(doc);
  const validity = hasValidity(doc);
  return (
    <tr className="cursor-pointer border-t hover:bg-muted/40" onClick={() => p.onOpen(doc)}>
      <td className="px-3 py-2">
        <span className="flex items-center gap-2"><span className={cn('grid size-8 shrink-0 place-items-center rounded-md', toneFor(doc))}><Icon className="size-4" aria-hidden /></span><span className="text-sm font-medium">{doc.type.name}</span></span>
      </td>
      <td className="max-w-[18rem] px-3 py-2">
        {p.withMachine && doc.machine && <p className="truncate text-xs font-medium">{doc.machine.name} · {doc.machine.assetCode}</p>}
        <p className="truncate text-sm">{doc.title}</p>
        {doc.fileCount > 1 ? <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={(e) => { e.stopPropagation(); p.onGallery(doc); }}>{doc.fileCount} files</button> : <FileLink doc={doc} onOpen={p.onOpen} />}
      </td>
      <td className={cn('px-3 py-2 text-sm text-muted-foreground', vis(p.hide, 'number', 'hidden xl:table-cell'))}>{doc.documentNumber ?? '—'}</td>
      <td className={cn('px-3 py-2 text-sm text-muted-foreground', vis(p.hide, 'issuer', 'hidden xl:table-cell'))}>{doc.issuer ?? '—'}</td>
      <td className="px-3 py-2 text-sm">
        {validity ? (<><span className={cn('whitespace-nowrap font-semibold', VALID_TILL_COLOUR[doc.status])}>{longDay(doc.validTill)}</span>{doc.validTill && <span className="block text-xs text-muted-foreground">{doc.statusLabel}</span>}</>) : <span className="whitespace-nowrap text-muted-foreground">{longDay(doc.issuedAt ?? doc.uploadedAt)}</span>}
      </td>
      <td className="px-3 py-2">{pill ? <StatusPill status={pill} /> : <span className="text-xs text-muted-foreground">—</span>}</td>
      <td className={cn('px-3 py-2 text-xs text-muted-foreground', vis(p.hide, 'uploaded', 'hidden lg:table-cell'))}>{doc.uploadedBy?.name ?? '—'}<span className="block">{longDay(doc.uploadedAt)}</span></td>
      <td className={cn('px-3 py-2 text-xs text-muted-foreground', vis(p.hide, 'workOrder', 'hidden 2xl:table-cell'))}>{doc.workOrder?.code ?? '—'}</td>
      <td className="w-12 px-1 py-2 text-right" onClick={(e) => e.stopPropagation()}><DocumentActions {...p} /></td>
    </tr>
  );
}
