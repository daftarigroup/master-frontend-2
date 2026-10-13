import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCostEdit } from '@/features/asset/equipment/lib/useCostAccess';
import type { AssignmentAction, AssignmentRow } from '../types';

/** Assign / Transfer / Release / Change operator for one machine. Offered to admins only (the server enforces it). */
export function RowActions({ row, onAction }: { row: AssignmentRow; onAction: (a: AssignmentAction) => void }) {
  const admin = useCostEdit();
  if (!admin) return null;
  const a = row.assignment;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 gap-1 lg:h-9" aria-label={`Actions for ${row.machine.name}`}>
          <MoreVertical className="size-4" aria-hidden />
          <span className="hidden lg:inline">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="min-h-11" onSelect={() => onAction({ kind: 'assign', row })}>{a ? 'Reassign to project' : 'Assign to project'}</DropdownMenuItem>
        {a && <DropdownMenuItem className="min-h-11" onSelect={() => onAction({ kind: 'transfer', row })}>Request transfer</DropdownMenuItem>}
        <DropdownMenuItem
          className="min-h-11"
          onSelect={() => onAction({
            kind: 'operator',
            machine: { id: row.machine.id, name: row.machine.name },
            current: row.operator,
            currentOperators: row.operators ?? (row.operator ? [row.operator] : [])
          })}
        >
          {row.operator || (row.operators && row.operators.length > 0) ? 'Change operator' : 'Assign operator'}
        </DropdownMenuItem>
        {a && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="min-h-11 text-red-600 focus:text-red-600" onSelect={() => onAction({ kind: 'release', row })}>Release machine</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
