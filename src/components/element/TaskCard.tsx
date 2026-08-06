import { type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface TaskCardMetaItem {
    icon: ReactNode;
    label: string;
    value: ReactNode;
}

interface TaskCardProps {
    idChip: string;
    onCopyId?: () => void;
    idCopied?: boolean;
    statusBadge: ReactNode;
    priorityTag?: ReactNode;
    title: ReactNode;
    meta: TaskCardMetaItem[];
    remark?: ReactNode;
    /** Action buttons rendered in the footer — reuse each page's existing button markup. */
    actions?: ReactNode;
    selected?: boolean;
    onToggleSelect?: () => void;
    muted?: boolean;
    className?: string;
}

/**
 * One-card-per-task shell for mobile list views, replacing wide horizontally-scrolling tables.
 * Keeps every field/action a table row would show, laid out for a narrow screen instead.
 */
export default function TaskCard({
    idChip,
    onCopyId,
    idCopied,
    statusBadge,
    priorityTag,
    title,
    meta,
    remark,
    actions,
    selected,
    onToggleSelect,
    muted,
    className,
}: TaskCardProps) {
    return (
        <Card className={cn('py-0 shadow-2xs', selected && 'bg-sky-50/50 dark:bg-sky-950/20', muted && 'opacity-75', className)}>
            <CardContent className="p-3.5 space-y-2.5">
                {/* Header row: checkbox, ID chip, priority, status */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        {onToggleSelect && (
                            <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label={`Select task ${idChip}`} />
                        )}
                        <button
                            type="button"
                            onClick={onCopyId}
                            disabled={!onCopyId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-foreground transition-colors font-extrabold text-[11px] shrink-0"
                        >
                            {onCopyId && (idCopied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} className="opacity-60" />)}
                            <span>{idChip}</span>
                        </button>
                        {priorityTag}
                    </div>
                    {statusBadge}
                </div>

                {/* Title / description */}
                <p className="font-bold text-sm text-foreground leading-snug">{title}</p>

                {/* Meta grid */}
                {meta.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        {meta.map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
                                <span className="shrink-0 opacity-70">{item.icon}</span>
                                <span className="truncate">
                                    <span className="opacity-70">{item.label}: </span>
                                    <span className="font-semibold text-foreground">{item.value}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {remark && <p className="text-xs italic text-muted-foreground border-t pt-2">{remark}</p>}

                {actions && <div className="flex items-center justify-end gap-2 border-t pt-2.5">{actions}</div>}
            </CardContent>
        </Card>
    );
}
