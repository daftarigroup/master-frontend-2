import { type ReactNode, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface FilterToolbarProps {
    /** Search input — shown full-width above filters on mobile, inline with filters on desktop. */
    search?: ReactNode;
    /** Filter controls (Select dropdowns, etc.) — inline row on desktop, stacked sheet on mobile. */
    filters: ReactNode;
    /** Count of filters currently set away from their default value — shown as a badge on the mobile Filters button. */
    activeFilterCount?: number;
    /** Extra content (tabs, batch-action bar) rendered above the search/filter row on both breakpoints. */
    extra?: ReactNode;
    className?: string;
}

/**
 * Consistent filter/search toolbar shell used across checklist pages.
 * Desktop (>=md): search + filter selects render inline, unchanged.
 * Mobile (<md): search is full-width; filter selects move into a bottom sheet
 * behind a single "Filters" button, so narrow screens don't wrap into a messy multi-row toolbar.
 */
export default function FilterToolbar({ search, filters, activeFilterCount = 0, extra, className }: FilterToolbarProps) {
    const [sheetOpen, setSheetOpen] = useState(false);

    return (
        <div className={`bg-card p-3 rounded-xl border shadow-2xs space-y-3 ${className || ''}`}>
            {extra}

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3">
                {search && <div className="flex-1 md:flex-initial">{search}</div>}

                {/* Desktop: filters render inline */}
                <div className="hidden md:flex items-center gap-2 flex-wrap flex-1">{filters}</div>

                {/* Mobile: filters collapse behind a single Filters button */}
                <div className="md:hidden">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSheetOpen(true)}
                        className="h-9 w-full text-xs gap-1.5 relative"
                    >
                        <SlidersHorizontal size={13} />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="ml-1 inline-flex items-center justify-center size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                                {activeFilterCount}
                            </span>
                        )}
                    </Button>
                </div>
            </div>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
                    <SheetHeader className="text-left">
                        <SheetTitle className="text-sm font-bold flex items-center gap-1.5">
                            <SlidersHorizontal size={14} />
                            Filters
                        </SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col gap-3 px-4 pb-4">{filters}</div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
