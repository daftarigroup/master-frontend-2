import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import { useSaveTemplate } from '../server/useRecordQueries';
import type { ChecklistTemplate } from '../types';

export function TemplateEditor({ firmId, initial, onDone }: { firmId: string; initial: ChecklistTemplate | null; onDone: (saved?: ChecklistTemplate | null) => void }) {
  const save = useSaveTemplate();
  const [name, setName] = useState(initial?.name ?? '');
  const [items, setItems] = useState<string[]>(initial ? initial.items.map((i) => i.text) : ['']);
  const [error, setError] = useState('');

  const move = (i: number, by: -1 | 1) =>
    setItems((arr) => {
      const j = i + by;
      if (j < 0 || j >= arr.length) return arr;
      const next = [...arr];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const submit = async () => {
    const clean = items.map((t) => t.trim()).filter(Boolean);
    if (!name.trim()) return setError('Give the checklist a name');
    if (clean.length === 0) return setError('Add at least one item');
    setError('');
    try {
      const res = await save.mutateAsync({ id: initial?.id, firmId, name: name.trim(), items: clean });
      toast.success('Checklist saved');
      onDone(res as ChecklistTemplate);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not save the checklist'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="tpl-name">Name</Label>
        <Input id="tpl-name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </div>
      <ol className="space-y-2" aria-label="Checklist items">
        {items.map((t, i) => (
          <li key={i} className="flex items-center gap-1">
            <Input className="h-11 flex-1" value={t} aria-label={`Item ${i + 1}`} maxLength={200} onChange={(e) => setItems((a) => a.map((x, k) => (k === i ? e.target.value : x)))} />
            <Button variant="ghost" size="icon" className="size-11" aria-label={`Move item ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
            <Button variant="ghost" size="icon" className="size-11" aria-label={`Move item ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
            <Button variant="ghost" size="icon" className="size-11" aria-label={`Remove item ${i + 1}`} disabled={items.length === 1} onClick={() => setItems((a) => a.filter((_, k) => k !== i))}><Trash2 className="size-4" /></Button>
          </li>
        ))}
      </ol>
      <Button variant="outline" className="h-11" onClick={() => setItems((a) => [...a, ''])}><Plus className="size-4" /> Add item</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="h-11" onClick={() => onDone(null)}>Cancel</Button>
        <Button className="h-11" disabled={save.isPending} onClick={submit}>{save.isPending ? 'Saving…' : 'Save checklist'}</Button>
      </div>
    </div>
  );
}

/** Admin: checklist templates for the machine's firm. Saving replaces the items; open work orders keep the checklist they were made with. */
export function TemplatesDialog({ open, onOpenChange, firmId, templates }: { open: boolean; onOpenChange: (o: boolean) => void; firmId: string; templates: ChecklistTemplate[] }) {
  const [editing, setEditing] = useState<ChecklistTemplate | 'new' | null>(null);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setEditing(null); onOpenChange(o); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Checklist templates</DialogTitle>
          <DialogDescription>Copied onto each service work order when it is scheduled.</DialogDescription>
        </DialogHeader>
        {editing ? (
          <TemplateEditor key={editing === 'new' ? 'new' : editing.id} firmId={firmId} initial={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
        ) : (
          <div className="space-y-3">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates yet.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {templates.map((t) => (
                  <li key={t.id}>
                    <button type="button" className="flex min-h-12 w-full items-center gap-2 p-3 text-left hover:bg-muted" onClick={() => setEditing(t)}>
                      <span className="flex-1 truncate text-sm font-semibold">{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.items.length} items</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button className="h-11" onClick={() => setEditing('new')}><Plus className="size-4" /> New template</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
