'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface HrTableProps {
  columns: string[];
  children: React.ReactNode;
  empty?: React.ReactNode;
  className?: string;
}

export function HrTable({ columns, children, empty, className }: HrTableProps) {
  const hasRows = React.Children.count(children) > 0;
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-max">
        <thead className="bg-muted/40 border-border border-b">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="text-muted-foreground px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.07em] whitespace-nowrap"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {hasRows ? (
            children
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-5 py-10 text-center">
                {empty ?? <span className="text-muted-foreground text-sm">No records found.</span>}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface HrTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}
export function HrTableRow({ className, ...props }: HrTableRowProps) {
  return <tr className={cn('hover:bg-muted/40 transition-colors', className)} {...props} />;
}

interface HrTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}
export function HrTableCell({ className, ...props }: HrTableCellProps) {
  return <td className={cn('text-foreground px-5 py-3.5 text-sm', className)} {...props} />;
}

export default HrTable;
