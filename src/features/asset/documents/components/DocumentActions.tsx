import { Ban, Download, Eye, ImagePlus, MoreVertical, Pencil, RefreshCw, Replace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { openDocFile } from '../lib/openDocFile';
import type { DocRow } from '../types';

interface Props {
  doc: DocRow;
  onOpen: (d: DocRow) => void;
  onRenew: (d: DocRow) => void;
  onEdit: (d: DocRow) => void;
  onReplace: (d: DocRow) => void;
  onAddFiles: (d: DocRow) => void;
  onVoid: (d: DocRow) => void;
}

/** Kebab menu: View / Download, Renew, Edit details, Replace file, Void. Items the server did not allow (canEdit / canRenew / canVoid) are not shown. */
export function DocumentActions({ doc, onOpen, onRenew, onEdit, onReplace, onAddFiles, onVoid }: Props) {
  const first = doc.files[0];
  const multi = doc.type.allowMultipleFiles;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="-mr-1.5 size-10 shrink-0 lg:mr-0 lg:size-8" aria-label={`Actions for ${doc.title}`} onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {first && doc.fileCount === 1 ? (
          <>
            <DropdownMenuItem className="min-h-10 lg:min-h-0" onSelect={() => void openDocFile(first.id, 'view')}><Eye className="size-4" /> View</DropdownMenuItem>
            <DropdownMenuItem className="min-h-10 lg:min-h-0" onSelect={() => void openDocFile(first.id, 'download')}><Download className="size-4" /> Download</DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem className="min-h-10 lg:min-h-0" onSelect={() => onOpen(doc)}><Eye className="size-4" /> View files</DropdownMenuItem>
        )}
        {(doc.canRenew || doc.canEdit || doc.canVoid) && <DropdownMenuSeparator />}
        {doc.canRenew && <DropdownMenuItem className="min-h-10 lg:min-h-0" onSelect={() => onRenew(doc)}><RefreshCw className="size-4" /> Renew</DropdownMenuItem>}
        {doc.canEdit && <DropdownMenuItem className="min-h-10 lg:min-h-0" onSelect={() => onEdit(doc)}><Pencil className="size-4" /> Edit details</DropdownMenuItem>}
        {doc.canEdit && <DropdownMenuItem className="min-h-10 lg:min-h-0" onSelect={() => onReplace(doc)}><Replace className="size-4" /> Replace file{multi ? 's' : ''}</DropdownMenuItem>}
        {doc.canEdit && multi && <DropdownMenuItem className="min-h-10 lg:min-h-0" onSelect={() => onAddFiles(doc)}><ImagePlus className="size-4" /> Add photos</DropdownMenuItem>}
        {doc.canVoid && <DropdownMenuItem className="min-h-10 text-destructive focus:text-destructive lg:min-h-0" onSelect={() => onVoid(doc)}><Ban className="size-4" /> Void</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
