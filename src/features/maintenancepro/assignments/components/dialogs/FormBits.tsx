import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSiteLocationsList, useUsersList } from '@/features/asset/asset/server/tanstackQuery/useAssetQueries';
import { useFirmOptions } from '../../server/useAssignmentQueries';

const NONE = '__none__';

export function Field({ label, htmlFor, required, error, children }: { label: string; htmlFor?: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span aria-hidden className="text-red-600"> *</span>}
      </Label>
      {children}
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

interface ShellProps {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  pending: boolean;
  error?: string;
  destructive?: boolean;
  children?: ReactNode;
}

/** Shell shared by every action dialog: title, body, inline error from the server, Cancel / confirm. Mount it only while open so state starts fresh. */
export function ActionDialog({ title, description, onClose, onSubmit, submitLabel, pending, error, destructive, children }: ShellProps) {
  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-3">{children}</div>
          {error && <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" variant={destructive ? 'destructive' : 'default'} className="h-11" disabled={pending}>{pending ? 'Saving…' : submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UserSelect({ value, onChange, placeholder = 'Select person' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const users = useUsersList();
  const options = (users.data ?? []).map((u) => ({ value: u.id, label: u.name, sublabel: u.role }));
  return <SearchableSelect options={options} value={value} onValueChange={onChange} placeholder={users.isLoading ? 'Loading…' : placeholder} searchPlaceholder="Search people" className="h-11 w-full" />;
}

export function UserCheckboxSelect({
  value,
  onChange,
  placeholder = 'Search operators...',
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const users = useUsersList();
  const [search, setSearch] = useState('');

  const allUsers = users.data ?? [];
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return allUsers;
    const q = search.toLowerCase();
    return allUsers.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
    );
  }, [allUsers, search]);

  const selectedUsers = useMemo(() => {
    const map = new Map(allUsers.map((u) => [u.id, u]));
    return value.map((id) => map.get(id) || { id, name: `Operator #${id}`, role: '' });
  }, [allUsers, value]);

  const isAllFilteredSelected =
    filteredUsers.length > 0 && filteredUsers.every((u) => value.includes(u.id));

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filteredUsers.map((u) => u.id));
      onChange(value.filter((id) => !filteredIds.has(id)));
    } else {
      const set = new Set(value);
      filteredUsers.forEach((u) => set.add(u.id));
      onChange(Array.from(set));
    }
  };

  const toggleUser = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  };

  return (
    <div className="space-y-2">
      {/* Search Header */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="h-9 pl-9 pr-8 text-xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Selected summary bar */}
      <div className="flex items-center justify-between text-xs px-0.5">
        <span className="font-medium text-muted-foreground">
          {value.length === 0 ? (
            'No operator selected'
          ) : (
            <span className="text-primary font-semibold">
              {value.length} operator{value.length === 1 ? '' : 's'} selected
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {filteredUsers.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="text-xs text-primary hover:underline font-medium cursor-pointer"
            >
              {isAllFilteredSelected ? 'Deselect all' : 'Select all'}
            </button>
          )}
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Selected tags */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-muted/40 rounded-lg max-h-20 overflow-y-auto border border-border/50">
          {selectedUsers.map((u) => (
            <Badge
              key={u.id}
              variant="secondary"
              className="gap-1 text-[11px] py-0.5 px-2 bg-background border shadow-2xs font-normal"
            >
              <span className="font-medium text-foreground">{u.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleUser(u.id);
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-0.5 cursor-pointer"
                title={`Remove ${u.name}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Checkbox List */}
      <div className="rounded-lg border bg-background divide-y max-h-52 overflow-y-auto">
        {users.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>Loading operators...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No matching operators found
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isChecked = value.includes(u.id);
            return (
              <label
                key={u.id}
                htmlFor={`op-user-${u.id}`}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer select-none transition-colors hover:bg-accent/50',
                  isChecked && 'bg-primary/5 dark:bg-primary/10'
                )}
              >
                <Checkbox
                  id={`op-user-${u.id}`}
                  checked={isChecked}
                  onCheckedChange={() => toggleUser(u.id)}
                  className="data-[state=checked]:bg-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{u.name}</div>
                  {u.role && (
                    <div className="text-[11px] text-muted-foreground truncate">{u.role}</div>
                  )}
                </div>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

interface FirmSiteProps {
  firmId: string;
  siteId: string;
  onFirm: (id: string) => void;
  onSite: (id: string) => void;
  firmLabel?: string;
  siteLabel?: string;
  firmError?: string;
}

/** Firm, then the sites of that firm (a site belongs to one firm; the server rejects a mismatch). */
export function FirmSiteFields({ firmId, siteId, onFirm, onSite, firmLabel = 'Project (firm)', siteLabel = 'Site', firmError }: FirmSiteProps) {
  const { firms, isLoading } = useFirmOptions();
  const sites = useSiteLocationsList();
  const mine = (sites.data ?? []).filter((s) => s.firmId === firmId);
  return (
    <>
      <Field label={firmLabel} required error={firmError}>
        <Select
          value={firmId || undefined}
          onValueChange={(v) => {
            onFirm(v);
            onSite('');
          }}
        >
          <SelectTrigger aria-label={firmLabel} className="h-11 w-full"><SelectValue placeholder={isLoading ? 'Loading…' : 'Select firm'} /></SelectTrigger>
          <SelectContent>{firms.map((f) => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label={siteLabel}>
        <Select value={siteId || NONE} onValueChange={(v) => onSite(v === NONE ? '' : v)} disabled={!firmId}>
          <SelectTrigger aria-label={siteLabel} className="h-11 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No specific site</SelectItem>
            {mine.map((s) => <SelectItem key={s.id} value={s.id}>{s.location}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}
