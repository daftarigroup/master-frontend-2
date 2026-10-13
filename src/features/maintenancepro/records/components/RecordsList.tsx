import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CalendarClock, CheckCircle2, HelpCircle, Search, SearchX } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { KpiTile } from '@/components/shared/KpiTile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useSiteLocationsList } from '@/features/asset/asset/server/tanstackQuery/useAssetQueries';
import { CATEGORY_LABEL } from '@/features/asset/equipment/lib/labels';
import { EQUIPMENT_CATEGORIES } from '@/features/asset/equipment/types';
import { useProject } from '@/context/ProjectContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePagination } from '@/hooks/usePagination';
import { toFirmParam } from '../../shared/lib/common';
import { useRecordList } from '../server/useRecordQueries';
import type { DueStatus } from '../types';
import { RecordCard, RecordsTable } from './RecordViews';

const ALL = '__all__';
const DUE_VALUES: DueStatus[] = ['OVERDUE', 'DUE_SOON', 'OK', 'NOT_SET'];

export default function RecordsList() {
  const [params, setParams] = useSearchParams();
  const { page, limit, setPage, setLimit } = usePagination(20);
  const { selectedProject } = useProject();
  const firmId = toFirmParam(selectedProject);
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const siteId = params.get('siteId') ?? '';
  const rawDue = params.get('due') ?? '';
  const due = (DUE_VALUES as string[]).includes(rawDue) ? (rawDue as DueStatus) : '';

  const patch = (changes: Record<string, string>) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      next.set('page', '1');
      return next;
    }, { replace: true });

  const [text, setText] = useState(q);
  const debounced = useDebouncedValue(text, 350);
  useEffect(() => setText(q), [q]);
  useEffect(() => {
    if (debounced.trim() !== q) patch({ q: debounced.trim() });
    // only when the typed text settles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const sites = useSiteLocationsList();
  const siteOptions = (sites.data ?? []).filter((s) => !firmId || !s.firmId || String(s.firmId) === String(firmId));
  const list = useRecordList({ dueStatus: due, q, category, siteId, firmId, limit, offset: (page - 1) * limit });
  const data = list.data;
  const stats = data?.stats;
  const toggle = (d: DueStatus) => patch({ due: due === d ? '' : d });
  const filtered = !!(q || category || siteId || due);

  return (
    <div className="space-y-3 lg:space-y-4">
      <div>
        <h1 className="text-lg font-bold leading-tight lg:text-xl">Maintenance Records</h1>
        <p className="text-xs text-muted-foreground lg:text-sm">Track and manage equipment maintenance</p>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" role="group" aria-label="Filter by service status">
        <KpiTile label="Overdue" value={stats?.overdue ?? '—'} icon={AlertTriangle} tone="red" active={due === 'OVERDUE'} onClick={() => toggle('OVERDUE')} className="min-h-14" />
        <KpiTile label="Due soon" value={stats?.dueSoon ?? '—'} icon={CalendarClock} tone="amber" active={due === 'DUE_SOON'} onClick={() => toggle('DUE_SOON')} className="min-h-14" />
        <KpiTile label="OK" value={stats?.ok ?? '—'} icon={CheckCircle2} tone="emerald" active={due === 'OK'} onClick={() => toggle('OK')} className="min-h-14" />
        <KpiTile label="Not set" value={stats?.notSet ?? '—'} icon={HelpCircle} tone="slate" active={due === 'NOT_SET'} onClick={() => toggle('NOT_SET')} className="min-h-14" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by name, asset code or registration" aria-label="Search machines" className="h-11 pl-9 lg:h-9" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={category || ALL} onValueChange={(v) => patch({ category: v === ALL ? '' : v })}>
            <SelectTrigger className="h-11 sm:w-40 lg:h-9" aria-label="Category"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {EQUIPMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={siteId || ALL} onValueChange={(v) => patch({ siteId: v === ALL ? '' : v })}>
            <SelectTrigger className="h-11 sm:w-40 lg:h-9" aria-label="Site"><SelectValue placeholder="Site" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sites</SelectItem>
              {siteOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.location}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {list.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : list.isError ? (
        <div role="alert" className="grid place-items-center gap-2 rounded-xl border p-8 text-center">
          <AlertCircle className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-semibold">Could not load maintenance records</p>
          <Button onClick={() => list.refetch()}>Retry</Button>
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-xl border p-8 text-center">
          <SearchX className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-semibold">{filtered ? 'No machines match these filters' : 'No machines to maintain yet'}</p>
          {filtered && <Button variant="outline" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Clear filters</Button>}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground" aria-live="polite">{data.total} machine{data.total === 1 ? '' : 's'}</p>
          <div className="space-y-2 lg:hidden">{data.rows.map((r) => <RecordCard key={r.machine.id} row={r} />)}</div>
          <div className="hidden lg:block"><RecordsTable rows={data.rows} /></div>
          <PaginationBar page={page} totalPages={Math.max(1, Math.ceil(data.total / limit))} onPageChange={setPage} pageSize={limit} onPageSizeChange={setLimit} />
        </>
      )}
    </div>
  );
}
