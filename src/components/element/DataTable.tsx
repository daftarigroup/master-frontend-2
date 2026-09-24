'use client';

import {
    type ColumnDef,
    type Row,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    useReactTable,
} from '@tanstack/react-table';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from '@/components/ui/table';
import { useState, useRef, type ReactNode, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Package, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { ClipLoader } from 'react-spinners';
import { HorizontalScrollIndicator } from '../ui/horizontal-scroll-indicator';
import { cn } from '@/lib/utils';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

/**
 * Mobile (<768px) row rendering: the first two visible cells become the
 * card's title/badge row, the rest collapse into a GSAP-animated details
 * accordion (label = column header, value = rendered cell) — see
 * APP_DESIGN_LAYOUT_DOCUMENTATION.md §5 for the reference card template.
 */
function MobileRowCard<TData>({ row }: { row: Row<TData> }) {
    const [expanded, setExpanded] = useState(false);
    const detailRef = useRef<HTMLDivElement>(null);
    const isFirstRender = useRef(true);

    useGSAP(
        () => {
            const el = detailRef.current;
            if (!el) return;

            if (isFirstRender.current) {
                isFirstRender.current = false;
                gsap.set(el, { height: 0, opacity: 0, display: 'none' });
                return;
            }

            if (expanded) {
                gsap.set(el, { display: 'block' });
                gsap.fromTo(el, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.25, ease: 'power2.out' });
            } else {
                gsap.to(el, {
                    height: 0,
                    opacity: 0,
                    duration: 0.2,
                    ease: 'power1.out',
                    onComplete: () => {
                        if (el) el.style.display = 'none';
                    },
                });
            }
        },
        { dependencies: [expanded], scope: detailRef }
    );

    const cells = row.getVisibleCells();
    if (!cells.length) return null;
    const [primary, secondary, ...rest] = cells;

    return (
        <Card className="p-3 gap-2 text-xs border shadow-xs rounded-lg">
            <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1 font-bold truncate">
                    {flexRender(primary.column.columnDef.cell, primary.getContext())}
                </div>
                {secondary && (
                    <div className="shrink-0">
                        {flexRender(secondary.column.columnDef.cell, secondary.getContext())}
                    </div>
                )}
            </div>

            {rest.length > 0 && (
                <>
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="flex items-center gap-1 text-primary font-semibold pt-1 text-[11px]"
                    >
                        {expanded ? 'Hide details' : 'View details'}
                        <ChevronDown size={12} className={cn('transition-transform duration-200', expanded && 'rotate-180')} />
                    </button>
                    <div ref={detailRef} className="overflow-hidden">
                        <div className="grid grid-cols-1 gap-1.5 pt-2 border-t">
                            {rest.map((cell) => {
                                const headerDef = cell.column.columnDef.header;
                                const headerLabel = typeof headerDef === 'string'
                                    ? headerDef
                                    : typeof headerDef === 'function'
                                        ? flexRender(headerDef, {
                                            header: { column: cell.column } as any,
                                            column: cell.column,
                                            table: cell.getContext().table,
                                          })
                                        : (cell.column.id || '');

                                return (
                                    <div key={cell.id} className="flex justify-between gap-3">
                                        <span className="text-muted-foreground shrink-0">
                                            {headerLabel}
                                        </span>
                                        <span className="text-right font-medium min-w-0 truncate">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </Card>
    );
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    searchFields?: string[];
    dataLoading?: boolean;
    children?: ReactNode;
    footer?: ReactNode | ((info: { table: any; filteredRows: Row<TData>[] }) => ReactNode);
    className?: string;
    extraActions?: ReactNode;
    rowSelection?: Record<string, boolean>;
    onRowSelectionChange?: (updater: any) => void;
    getRowId?: (row: TData) => string;
    meta?: any;
    onSearch?: (query: string) => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
    loadingMore?: boolean;
    searchValue?: string;
}

function globalFilterFn<TData>(row: TData, columnIds: string[], filterValue: string) {
    if (!filterValue) return true;
    const lowerFilter = filterValue.toLowerCase();
    if (columnIds && columnIds.length > 0) {
        return columnIds.some((columnId) => {
            const value = (row as any)[columnId];
            return String(value ?? '')
                .toLowerCase()
                .includes(lowerFilter);
        });
    }
    return Object.values(row as any).some((val) =>
        typeof val === 'object' && val !== null
            ? Object.values(val).some((nestedVal) => String(nestedVal ?? '').toLowerCase().includes(lowerFilter))
            : String(val ?? '').toLowerCase().includes(lowerFilter)
    );
}

export default function DataTable<TData, TValue>({
    columns,
    data,
    searchFields = [],
    dataLoading,
    children,
    footer,
    className,
    extraActions,
    rowSelection = {},
    onRowSelectionChange,
    getRowId,
    meta,
    onSearch,
    onLoadMore,
    hasMore = false,
    loadingMore = false,
    searchValue,
}: DataTableProps<TData, TValue>) {
    const [globalFilter, setGlobalFilter] = useState('');
    const [searchInput, setSearchInput] = useState(searchValue ?? '');
    const scrollRef = useRef<HTMLDivElement>(null);
    const mobileScrollRef = useRef<HTMLDivElement>(null);
    const [isScrollableHorizontally, setIsScrollableHorizontally] = useState(false);
    const isFirstSearchRender = useRef(true);
    // Prevents multiple concurrent load-more calls from rapid scroll events
    // before React can propagate loadingMore=true back into props
    const loadMoreInFlight = useRef(false);

    // Sync external searchValue if provided
    useEffect(() => {
        if (searchValue !== undefined && searchValue !== searchInput) {
            setSearchInput(searchValue);
        }
    }, [searchValue]);

    // Debounce search query to hit database when onSearch is provided
    useEffect(() => {
        if (!onSearch) return;
        if (isFirstSearchRender.current) {
            isFirstSearchRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            onSearch(searchInput);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput, onSearch]);

    // Reset in-flight flag once the parent signals loading is done
    useEffect(() => {
        if (!loadingMore) {
            loadMoreInFlight.current = false;
        }
    }, [loadingMore]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        enableRowSelection: !!onRowSelectionChange,
        globalFilterFn: (row, _, filterValue) =>
            onSearch ? true : (row?.original ? globalFilterFn(row.original, searchFields || [], filterValue) : false),
        getRowId,
        meta,
        state: {
            globalFilter: onSearch ? '' : globalFilter,
            rowSelection: rowSelection || {},
        },
        onGlobalFilterChange: setGlobalFilter,
        onRowSelectionChange: onRowSelectionChange,
    });

    const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (!onLoadMore || !hasMore || loadingMore || dataLoading || loadMoreInFlight.current) return;
        const threshold = 150;
        if (el.scrollHeight - el.scrollTop - el.clientHeight <= threshold) {
            loadMoreInFlight.current = true;
            onLoadMore();
        }
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const updateScrollable = () => {
            setIsScrollableHorizontally(el.scrollWidth > el.clientWidth);
        };

        updateScrollable();

        // Listen to scroll and resize
        window.addEventListener('resize', updateScrollable);
        el.addEventListener('scroll', updateScrollable);

        const ro = new ResizeObserver(updateScrollable);
        ro.observe(el);

        const firstChild = el.firstElementChild;
        if (firstChild) ro.observe(firstChild);

        // Add custom wheel event listener to translate vertical scroll to horizontal scroll
        const handleWheel = (e: WheelEvent) => {
            const isOverHeader = (e.target as HTMLElement).closest('thead') !== null;
            const noVerticalScroll = el.scrollHeight <= el.clientHeight;

            if (e.deltaY !== 0 && (e.shiftKey || isOverHeader || noVerticalScroll)) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };

        el.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            window.removeEventListener('resize', updateScrollable);
            el.removeEventListener('scroll', updateScrollable);
            ro.disconnect();
            el.removeEventListener('wheel', handleWheel);
        };
    }, []);

    return (
        <div className="p-3 sm:p-5 grid gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center w-full gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                        placeholder="Search..."
                        value={onSearch ? searchInput : globalFilter}
                        onChange={(e) => {
                            if (onSearch) {
                                setSearchInput(e.target.value);
                            } else {
                                setGlobalFilter(e.target.value);
                            }
                        }}
                        className="w-full sm:w-64 h-9 text-xs sm:text-sm rounded-xl"
                    />
                    {isScrollableHorizontally && (
                        <div className="flex items-center gap-1 border-l pl-2 ml-1 shrink-0">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                                title="Scroll Left (or hover header & scroll wheel)"
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                                title="Scroll Right (or hover header & scroll wheel)"
                            >
                                <ChevronRight size={16} />
                            </Button>
                            <span className="text-[10px] text-muted-foreground ml-1 hidden sm:inline">
                                Tip: Hover header & scroll wheel
                            </span>
                        </div>
                    )}
                </div>
                {extraActions && <div className="flex items-center gap-2 overflow-x-auto">{extraActions}</div>}
            </div>

            {/* Desktop / tablet (>=768px): standard scrollable data table */}
            <div className="relative w-full min-w-0 overflow-hidden hidden md:block">
                <div
                    ref={scrollRef}
                    onScroll={handleContainerScroll}
                    className={cn('rounded-sm border h-[74dvh] w-full overflow-auto scroll-smooth pb-4', className)}
                >
                    <Table className="min-w-max">
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>

                        <TableBody>
                            {dataLoading ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell
                                        colSpan={columns?.length || 0}
                                        className="h-50 text-center"
                                    >
                                        <div className="flex justify-center items-center w-full py-20">
                                            <ClipLoader color="#9333ea" size={40} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : table.getRowModel().rows?.length ? (
                                <>
                                    {table.getRowModel().rows.map((row) => (
                                        row && (
                                            <TableRow
                                                key={row.id}
                                                data-state={row.getIsSelected?.() && 'selected'}
                                                className="p-1"
                                            >
                                                {row.getVisibleCells?.().map((cell) => (
                                                    cell && (
                                                        <TableCell key={cell.id}>
                                                            {flexRender(
                                                                cell.column.columnDef.cell,
                                                                cell.getContext()
                                                            )}
                                                        </TableCell>
                                                    )
                                                ))}
                                            </TableRow>
                                        )
                                    ))}
                                    {loadingMore && (
                                        <TableRow className="hover:bg-transparent">
                                            <TableCell
                                                colSpan={columns?.length || 0}
                                                className="py-3 text-center border-t bg-muted/20"
                                            >
                                                <div className="flex justify-center items-center gap-2 text-xs font-medium text-primary">
                                                    <ClipLoader color="#9333ea" size={16} />
                                                    <span>Loading more records from database...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            ) : (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell
                                        colSpan={columns?.length || 0}
                                        className="h-50 text-center text-xl"
                                    >
                                        <div className="flex flex-col justify-center items-center w-full gap-1">
                                            <Package className="text-gray-400" size={50} />
                                            <p className="text-muted-foreground font-semibold">
                                                No Records Found.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        {table.getFooterGroups().some(fg => fg.headers.some(h => h.column.columnDef.footer)) && (
                            <TableFooter className="sticky bottom-0 z-10 bg-background border-t-2 shadow-xs">
                                {table.getFooterGroups().map((footerGroup) => (
                                    <TableRow key={footerGroup.id}>
                                        {footerGroup.headers.map((header) => (
                                            <TableCell key={header.id} className="font-bold">
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.footer,
                                                        header.getContext()
                                                    )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableFooter>
                        )}
                    </Table>
                </div>
                <div className="absolute bottom-1.5 inset-x-1 z-10 pointer-events-none">
                    <HorizontalScrollIndicator containerRef={scrollRef} className="pointer-events-auto" />
                </div>
            </div>

            {/* Mobile (<768px): stacked cards, primary fields up top, rest in an expandable accordion */}
            <div
                ref={mobileScrollRef}
                onScroll={handleContainerScroll}
                className={cn('md:hidden w-full space-y-2.5 overflow-y-auto pb-4 max-h-[74dvh]', className)}
            >
                {dataLoading ? (
                    <div className="flex justify-center items-center w-full py-20">
                        <ClipLoader color="#9333ea" size={40} />
                    </div>
                ) : table.getRowModel().rows?.length ? (
                    <>
                        {table.getRowModel().rows.map((row) => row && <MobileRowCard key={row.id} row={row} />)}
                        {loadingMore && (
                            <div className="flex justify-center items-center gap-2 py-3 text-xs font-medium text-primary bg-muted/20 rounded-lg">
                                <ClipLoader color="#9333ea" size={16} />
                                <span>Loading more records from database...</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col justify-center items-center w-full gap-1 py-16">
                        <Package className="text-gray-400" size={50} />
                        <p className="text-muted-foreground font-semibold text-sm">No records found.</p>
                    </div>
                )}
            </div>

            {footer && (
                <div className="flex justify-end items-center w-full">
                    {typeof footer === 'function'
                        ? footer({ table, filteredRows: table.getFilteredRowModel().rows })
                        : footer}
                </div>
            )}
            {children}
        </div>
    );
}
