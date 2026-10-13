import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { WorkLog } from '../types';

export interface LogHandlers {
  edit: (log: WorkLog) => void;
  approve: (log: WorkLog) => void;
  reject: (log: WorkLog) => void;
  reopen: (log: WorkLog) => void;
}

const hasActions = (log: WorkLog) => !!(log.canEdit || log.canApprove || log.canReopen);

/** Only what the server says this user may do is offered (it re-checks on every call). */
export function LogMenu({ log, handlers }: { log: WorkLog; handlers: LogHandlers }) {
  if (!hasActions(log)) return null;
  const label = log.logNumber ?? 'work log';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-11 lg:size-9" aria-label={`Actions for ${label}`}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {log.canEdit && <DropdownMenuItem onSelect={() => handlers.edit(log)}>Edit</DropdownMenuItem>}
        {log.canApprove && <DropdownMenuItem onSelect={() => handlers.approve(log)}>Approve</DropdownMenuItem>}
        {log.canApprove && <DropdownMenuItem onSelect={() => handlers.reject(log)}>Reject</DropdownMenuItem>}
        {log.canReopen && <DropdownMenuItem onSelect={() => handlers.reopen(log)}>Reopen</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ReasonProps {
  title: string;
  description: string;
  label: string;
  confirm: string;
  pending: boolean;
  onSubmit: (text: string) => void;
  onClose: () => void;
}

/** Reject and reopen both need a reason of at least 3 characters (the server enforces it too). */
export function ReasonDialog({ title, description, label, confirm, pending, onSubmit, onClose }: ReasonProps) {
  const [text, setText] = useState('');
  const [tried, setTried] = useState(false);
  const short = text.trim().length < 3;
  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="wl-reason">{label}</Label>
          <Textarea id="wl-reason" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={300} autoFocus />
          {tried && short && <p className="text-xs text-destructive">Give a reason (at least 3 characters).</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11"
            disabled={pending}
            onClick={() => {
              if (short) setTried(true);
              else onSubmit(text.trim());
            }}
          >
            {pending ? 'Saving…' : confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
