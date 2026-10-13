import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronRight, Download, LayoutGrid, List, Plus, QrCode, Search, SearchX, SlidersHorizontal } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { usePagination } from '@/hooks/usePagination';
import { toFirmParam } from '@/features/maintenancepro/shared/lib/common';
import { BulkQRModal } from '@/features/asset/asset/components/BulkQRModal';
import { QRCodeModal } from '@/features/asset/asset/components/QRCodeModal';
import type { Asset } from '@/features/asset/asset/types/types';
import { hasPageAccess } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { useColumnVisibility } from '../lib/columns';
import { CATEGORY_LABEL, STATUS_LABEL } from '../lib/labels';
import { detailPath } from '../lib/paths';
import { useCostAccess } from '../lib/useCostAccess';
import { useEquipmentFilters } from '../lib/useEquipmentFilters';
import { equipmentApi } from '../server/equipmentApi';
import { useEquipmentList } from '../server/useEquipmentQueries';
import type { EquipmentItem, SortKey } from '../types';
import { EquipmentCard } from './EquipmentCard';
import { EquipmentDrawer } from './EquipmentDrawer';
import { EquipmentFilterBar, SearchBox } from './EquipmentFilterBar';
import { EquipmentFilterChips, type FilterGroup } from './EquipmentFilterChips';
import { EquipmentStatTiles } from './EquipmentStatTiles';
import { ColumnPicker, EquipmentTable } from './EquipmentTable';

/** The QR tag modals were written for Asset records; a machine shares its asset code, so the tag resolves to the same asset. */
const toQrAsset = (m: EquipmentItem): Asset =>
  ({
    id: m.assetId ?? m.id,
    sn: m.assetCode,
    productName: m.name,
    brand: '',
    model: '',
    category: CATEGORY_LABEL[m.category],
    department: '',
    location: m.site ?? '',
    status: STATUS_LABEL[m.status],
  }) as unknown as Asset;

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function EquipmentMaster() {
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const firmId = toFirmParam(selectedProject);
  const navigate = useNavigate();
  const canCost = useCostAccess();
  const canAdd = hasPageAccess(user, 'maint_add_machine', 'VIEW', 'maintAddMachine');

  const { filters, view, setFilters, clearAll, activeCount } = useEquipmentFilters();
  const { page, limit, setPage, setLimit } = usePagination(20);
  const columns = useColumnVisibility();

  const query = useEquipmentList({ ...filters, firmId, limit, offset: (page - 1) * limit });
  const data = query.data;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / limit));

  const [filterSheet, setFilterSheet] = useState<FilterGroup | 'all' | null>(null);
  const [drawerItem, setDrawerItem] = useState<EquipmentItem | null>(null);
  const [qrItem, setQrItem] = useState<EquipmentItem | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, EquipmentItem>>({});
  const [exporting, setExporting] = useState(false);
  const searchWrap = useRef<HTMLDivElement>(null);

  const selectedItems = useMemo(() => Object.values(selected), [selected]);
  const selectedIds = useMemo(() => new Set(Object.keys(selected)), [selected]);
  const select = useCallback((m: EquipmentItem, on: boolean) => setSelected((prev) => {
    const next = { ...prev };
    if (on) next[m.id] = m; else delete next[m.id];
    return next;
  }), []);

  const onSort = (sort: SortKey) => setFilters(filters.sort === sort ? { dir: filters.dir === 'asc' ? 'desc' : 'asc' } : { sort, dir: 'asc' });

  const focusSearch = () => {
    const input = searchWrap.current?.querySelector('input');
    input?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    input?.focus();
  };

  /** Everything the current filters match (not just this page), as a CSV of the columns this user may see. */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const all: EquipmentItem[] = [];
      for (let offset = 0; ; offset += 200) {
        const res = await equipmentApi.list({ ...filters, firmId, limit: 200, offset });
        all.push(...res.items);
        if (all.length >= res.total || res.items.length === 0) break;
      }
      const head = ['Name', 'Asset code', 'Category', 'Ownership', 'Vendor', 'Site', 'Status', 'Utilization %', 'Hours/Km this month', 'Unit', 'Last reading', 'Last diesel', 'Fuel efficiency', ...(canCost ? ['Month spend'] : [])];
      const rows = all.map((m) => [
        m.name, m.assetCode, CATEGORY_LABEL[m.category], m.ownershipType === 'RENTED' ? 'Rented' : 'Owned', m.vendor, m.site, STATUS_LABEL[m.status],
        m.utilization.percent, m.hoursThisMonth, m.unit, m.lastReading, m.lastDieselDate, m.efficiency ? `${m.efficiency.value} ${m.efficiency.unit}` : '',
        ...(canCost ? [m.monthSpend ?? ''] : []),
      ]);
      const csv = '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `equipment-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not export the equipment list');
    } finally {
      setExporting(false);
    }
  };

  const items = data?.items;
  const showTable = view === 'table';
  const empty = !!data && data.items.length === 0;

  return (
    <div className="space-y-3 lg:space-y-4">
      {/* header: phone = title + search / filter / add; desktop = breadcrumb + actions */}
      <div>
        <nav aria-label="Breadcrumb" className="mb-1 hidden items-center gap-1 text-xs text-muted-foreground lg:flex">
          <span>Asset</span>
          <ChevronRight className="size-3" />
          <span className="font-medium text-foreground">Equipment Master</span>
        </nav>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight lg:text-xl">Equipment Master</h1>
            <p className="text-xs text-muted-foreground lg:text-sm">All equipment in your project</p>
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <Button variant="ghost" size="icon" className="size-11" aria-label="Search" onClick={focusSearch}><Search className="size-5" /></Button>
            <Button variant="ghost" size="icon" className="relative size-11" aria-label="Filters" onClick={() => setFilterSheet('all')}>
              <SlidersHorizontal className="size-5" />
              {activeCount > 0 && <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{activeCount}</span>}
            </Button>
            {canAdd && (
              <Button size="icon" className="size-11 rounded-full" aria-label="Add equipment" asChild>
                <Link to="/maintenance/machines/new"><Plus className="size-5" /></Link>
              </Button>
            )}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            {canAdd && (
              <Button asChild>
                <Link to="/maintenance/machines/new"><Plus className="size-4" /> Add Equipment</Link>
              </Button>
            )}
            <Button variant="outline" onClick={exportCsv} disabled={exporting}><Download className="size-4" /> {exporting ? 'Exporting…' : 'Export'}</Button>
            <Button variant="outline" disabled={selectedItems.length === 0} onClick={() => setBulkOpen(true)}>
              <QrCode className="size-4" /> QR Sheet{selectedItems.length > 0 ? ` (${selectedItems.length})` : ''}
            </Button>
          </div>
        </div>
      </div>

      {/* search + filters */}
      <div ref={searchWrap} className="lg:hidden">
        <SearchBox value={filters.q} onCommit={(q) => setFilters({ q })} />
      </div>
      <div className="lg:hidden">
        <EquipmentFilterChips filters={filters} onChange={setFilters} onClear={clearAll} open={filterSheet} onOpenChange={setFilterSheet} />
      </div>

      <EquipmentStatTiles
        stats={data?.stats}
        activeStatus={filters.status}
        activeOwnership={filters.ownership}
        onStatus={(status) => setFilters({ status })}
        onOwnership={(ownership) => setFilters({ ownership })}
        showSpend={canCost}
      />

      <div className="hidden space-y-2 lg:block">
        <SearchBox value={filters.q} onCommit={(q) => setFilters({ q })} className="max-w-md" />
        <EquipmentFilterBar filters={filters} onChange={setFilters} onClear={clearAll} activeCount={activeCount} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {data ? `${data.total} equipment found` : 'Loading equipment…'}
        </p>
        <div className="hidden items-center gap-2 lg:flex">
          {showTable && <ColumnPicker visible={columns.visible} onToggle={columns.toggle} onReset={columns.reset} showCost={canCost} />}
          <div className="inline-flex rounded-md border" role="group" aria-label="View">
            <Button variant={showTable ? 'secondary' : 'ghost'} size="sm" className="rounded-r-none" aria-pressed={showTable} onClick={() => setFilters({ view: 'table' })}><List className="size-4" /> Table</Button>
            <Button variant={!showTable ? 'secondary' : 'ghost'} size="sm" className="rounded-l-none" aria-pressed={!showTable} onClick={() => setFilters({ view: 'grid' })}><LayoutGrid className="size-4" /> Cards</Button>
          </div>
        </div>
      </div>

      {query.isError && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="size-5 shrink-0" />
          <span className="flex-1">Could not load equipment.</span>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>Retry</Button>
        </div>
      )}

      {empty && (
        <div className="grid place-items-center gap-2 rounded-xl border border-dashed p-10 text-center">
          <SearchX className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-semibold">No equipment found</p>
          <p className="text-sm text-muted-foreground">{activeCount > 0 || filters.q ? 'Nothing matches these filters.' : 'There is no equipment in your project yet.'}</p>
          {(activeCount > 0 || filters.q) && <Button variant="outline" onClick={clearAll}>Clear filters</Button>}
        </div>
      )}

      {/* cards: the phone list (and the desktop Cards view) */}
      {!empty && (
        <div className={cn('grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4', showTable && 'lg:hidden')}>
          {!items
            ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
            : items.map((m) => (
                <EquipmentCard
                  key={m.id}
                  item={m}
                  canCost={canCost}
                  density={showTable ? 'compact' : 'comfortable'}
                  selected={selectedIds.has(m.id)}
                  onOpen={(item) => (window.matchMedia('(min-width: 1024px)').matches ? setDrawerItem(item) : navigate(detailPath(item)))}
                  onQr={setQrItem}
                />
              ))}
        </div>
      )}

      {/* table: desktop only */}
      {showTable && !empty && (
        <div className="hidden lg:block">
          <EquipmentTable
            items={items}
            loading={query.isLoading}
            visible={columns.visible}
            showCost={canCost}
            filters={filters}
            onSort={onSort}
            selected={selectedIds}
            onSelect={(id, on) => { const m = items?.find((i) => i.id === id); if (m) select(m, on); }}
            onSelectAll={(on) => items?.forEach((m) => select(m, on))}
            activeId={drawerItem?.id ?? null}
            onOpen={setDrawerItem}
            onOpenFull={(m) => navigate(detailPath(m))}
            onQr={setQrItem}
          />
        </div>
      )}

      <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} pageSize={limit} onPageSizeChange={setLimit} pageSizeOptions={[10, 20, 50, 100]} />

      <EquipmentDrawer item={drawerItem} month={data?.month} canCost={canCost} onClose={() => setDrawerItem(null)} onQr={setQrItem} />
      <QRCodeModal asset={qrItem ? toQrAsset(qrItem) : null} open={!!qrItem} onOpenChange={(o) => !o && setQrItem(null)} />
      <BulkQRModal assets={selectedItems.map(toQrAsset)} open={bulkOpen} onOpenChange={setBulkOpen} />
    </div>
  );
}

export default EquipmentMaster;
