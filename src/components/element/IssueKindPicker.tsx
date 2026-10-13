import { Card, CardContent } from '@/components/ui/card';
import { Package, Wrench, Fuel } from 'lucide-react';
import { cn } from '@/lib/utils';

// Order types of the Store Issue page (database: issue.issue_kind).
//   MATERIAL      issue to a contractor / site: the original form
//   MAINTENANCE   machine parts issued to a machine / repair work order   (form arrives with the Maintenance & repair phase)
//   ASSET_DIESEL  diesel issued to a machine                              (form arrives with the Asset phase)
export type IssueKind = 'MATERIAL' | 'MAINTENANCE' | 'ASSET_DIESEL';

export const ISSUE_KIND_LABEL: Record<IssueKind, string> = {
    MATERIAL: 'Material issue',
    MAINTENANCE: 'Maintenance & repair',
    ASSET_DIESEL: 'Asset',
};

const KIND_INFO: Record<IssueKind, { hint: string; icon: typeof Package }> = {
    MATERIAL: { hint: 'Materials to a contractor or site', icon: Package },
    MAINTENANCE: { hint: 'Machine parts for repair and maintenance', icon: Wrench },
    ASSET_DIESEL: { hint: 'Diesel to a machine', icon: Fuel },
};

interface PickerProps {
    value: IssueKind;
    onChange: (kind: IssueKind) => void;
    /** kinds this user may use (MATERIAL is always first) */
    kinds: IssueKind[];
}

export function IssueKindPicker({ value, onChange, kinds }: PickerProps) {
    return (
        <Card className="border-slate-200 shadow-sm mb-6">
            <CardContent className="p-4 sm:p-5">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Order type</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {kinds.map((kind) => {
                        const { hint, icon: Icon } = KIND_INFO[kind];
                        const active = kind === value;
                        return (
                            <button
                                key={kind}
                                type="button"
                                onClick={() => onChange(kind)}
                                aria-pressed={active}
                                className={cn(
                                    'text-left rounded-lg border p-3 transition-colors flex items-start gap-3',
                                    active ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-slate-200 bg-white hover:border-primary/40'
                                )}
                            >
                                <Icon className={cn('size-5 mt-0.5 shrink-0', active ? 'text-primary' : 'text-slate-400')} />
                                <span>
                                    <span className="block text-sm font-semibold text-slate-800">{ISSUE_KIND_LABEL[kind]}</span>
                                    <span className="block text-xs text-slate-500">{hint}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
