import type { CSSProperties } from 'react';

const T = {
  card: 'var(--card)',
  border: 'var(--border)',
  fg: 'var(--foreground)',
  mutedFg: 'var(--muted-foreground)',
  primary: 'var(--primary)',
  primaryFg: 'var(--primary-foreground, #fff)',
};

export interface PaginationBarProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function PaginationBar({
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: PaginationBarProps) {
  const showPageSize = pageSize !== undefined && !!onPageSizeChange;
  if (totalPages <= 1 && !showPageSize) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const btnStyle = (disabled: boolean): CSSProperties => ({
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 6,
    border: `1px solid ${T.border}`,
    background: T.card,
    color: disabled ? T.mutedFg : T.fg,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {showPageSize && (
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: T.mutedFg,
          }}
        >
          Rows per page
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            style={{
              padding: '5px 8px',
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 6,
              border: `1px solid ${T.border}`,
              background: T.card,
              color: T.fg,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      )}
      {totalPages > 1 && (
        <>
          <button
            type="button"
            style={btnStyle(!canPrev)}
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </button>
          <span style={{ fontSize: 12, color: T.mutedFg, minWidth: 70, textAlign: 'center' }}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            style={btnStyle(!canNext)}
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </>
      )}
    </div>
  );
}

export default PaginationBar;
