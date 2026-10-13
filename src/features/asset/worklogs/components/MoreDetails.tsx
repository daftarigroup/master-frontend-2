import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect, type SearchableOption } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateWbs } from '@/features/asset/cost/server/useCostQueries';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import type { FormState } from '../lib/formModel';
import type { WorkType } from '../types';

const NONE = '__none__';

interface Props {
  f: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  workTypes: WorkType[];
  wbsOptions: SearchableOption[];
  firmId?: string;
}

const Field = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    {children}
  </div>
);

/** Everything beyond the required fields. All optional; one minute rule: nothing here blocks saving. */
export function MoreDetails({ f, set, workTypes, wbsOptions, firmId }: Props) {
  const [showAddWbs, setShowAddWbs] = useState(false);
  const [newWbsName, setNewWbsName] = useState('');
  const [newWbsCode, setNewWbsCode] = useState('');
  const [addWbsError, setAddWbsError] = useState('');

  const createWbs = useCreateWbs();

  const handleCreateWbs = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newWbsName.trim()) {
      setAddWbsError('Please enter an activity name');
      return;
    }
    if (!firmId) {
      setAddWbsError('Firm context is required to create a WBS activity');
      return;
    }

    const code =
      newWbsCode.trim() ||
      `${newWbsName.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'ACT'}-${Math.floor(10 + Math.random() * 90)}`;

    try {
      setAddWbsError('');
      const created = await createWbs.mutateAsync({
        firmId,
        name: newWbsName.trim(),
        code,
      });
      toast.success(`WBS activity "${created.name}" created`);
      set('wbsId', created.id);
      setShowAddWbs(false);
      setNewWbsName('');
      setNewWbsCode('');
    } catch (err) {
      setAddWbsError(apiErrorMessage(err, 'Failed to create WBS activity'));
    }
  };

  return (
    <div className="space-y-4">
      <Field id="wl-worktype" label="Work type">
        <Select value={f.workTypeId || NONE} onValueChange={(v) => set('workTypeId', v === NONE ? '' : v)}>
          <SelectTrigger id="wl-worktype" className="h-11 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Not set</SelectItem>
            {workTypes.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="wl-location" label="Work location">
        <Input id="wl-location" value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Block C foundation" className="h-11" />
      </Field>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>
            WBS activity <span className="font-normal text-muted-foreground"></span>
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-primary gap-1 px-2 hover:bg-primary/10 cursor-pointer"
            onClick={() => {
              setAddWbsError('');
              setShowAddWbs(true);
            }}
          >
            <Plus className="size-3.5" /> New Activity
          </Button>
        </div>

        {wbsOptions.length > 0 ? (
          <SearchableSelect
            options={[{ value: '', label: 'None (spread by hours)' }, ...wbsOptions]}
            value={f.wbsId}
            onValueChange={(v) => set('wbsId', v)}
            placeholder="Select WBS activity"
            searchPlaceholder="Search code or name"
            emptyText="No activity found"
            className="h-11 w-full"
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground font-medium">No WBS activities found</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 cursor-pointer bg-background"
                onClick={() => {
                  setAddWbsError('');
                  setShowAddWbs(true);
                }}
              >
                <Plus className="size-3.5" /> Add Activity
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Add project tasks (e.g. Loading, Excavation, Foundation) to attribute machine hours and fuel cost under that task instead of "Unassigned".
            </p>
          </div>
        )}
      </div>

      <Field id="wl-remarks" label="Remarks / notes">
        <Textarea id="wl-remarks" value={f.remarks} onChange={(e) => set('remarks', e.target.value)} rows={2} maxLength={500} />
      </Field>

      <Dialog open={showAddWbs} onOpenChange={setShowAddWbs}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add WBS Activity</DialogTitle>
            <DialogDescription>
              Create a work breakdown task to attribute machine hours and fuel costs against project milestones.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="wbs-new-name">Activity Name *</Label>
              <Input
                id="wbs-new-name"
                placeholder="e.g. Loading, Site Excavation, Piling"
                value={newWbsName}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewWbsName(val);
                  if (!newWbsCode || newWbsCode.endsWith('-01')) {
                    const clean = val.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
                    if (clean) setNewWbsCode(`${clean}-01`);
                  }
                }}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wbs-new-code">Activity Code (optional)</Label>
              <Input
                id="wbs-new-code"
                placeholder="e.g. LOAD-01, EXC-01"
                value={newWbsCode}
                onChange={(e) => setNewWbsCode(e.target.value)}
                className="h-11"
              />
              <p className="text-[11px] text-muted-foreground">Unique code for this activity (auto-generated if left blank).</p>
            </div>
            {addWbsError && (
              <p className="text-xs text-destructive font-medium">{addWbsError}</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setShowAddWbs(false)} disabled={createWbs.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreateWbs()} disabled={createWbs.isPending || !newWbsName.trim()}>
              {createWbs.isPending ? 'Creating…' : 'Create & Select'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
