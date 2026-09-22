import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function usePagination(defaultLimit = 20) {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.max(1, Number(searchParams.get('limit')) || defaultLimit);

  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', String(nextPage));
        return next;
      });
    },
    [setSearchParams]
  );

  const setLimit = useCallback(
    (nextLimit: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', '1');
        next.set('limit', String(nextLimit));
        return next;
      });
    },
    [setSearchParams]
  );

  return useMemo(() => ({ page, limit, setPage, setLimit }), [page, limit, setPage, setLimit]);
}

export default usePagination;
