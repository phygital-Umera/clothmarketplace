import {SortState} from '@/components/Forms';
import {ListParams} from '@/types/org';
import {useState} from 'react';
import useDebounce from './useDebounce';

/**
 * Page / page size / search / sort / filters for a server-paginated list.
 * Any filter change goes back to page 1.
 */
const useListState = (filters: Omit<ListParams, 'page' | 'limit'> = {}) => {
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [sort, setSort] = useState<SortState | undefined>();
  const [extra, setExtra] = useState(filters);
  const search = useDebounce(searchText, 300);

  const params: ListParams = {
    page,
    limit: 10,
    search: search || undefined,
    sortBy: sort?.key,
    sortDir: sort?.dir,
    ...extra,
  };

  return {
    params,
    searchText,
    setSearchText: (text: string) => {
      setSearchText(text);
      setPage(1);
    },
    setPage,
    sort,
    setSort: (next: SortState) => {
      setSort(next);
      setPage(1);
    },
    filters: extra,
    setFilter: (next: Partial<typeof filters>) => {
      setExtra((prev) => ({...prev, ...next}));
      setPage(1);
    },
    hasFilters: !!search || Object.values(extra).some(Boolean),
    clear: () => {
      setSearchText('');
      setExtra({});
      setPage(1);
    },
  };
};

export default useListState;
