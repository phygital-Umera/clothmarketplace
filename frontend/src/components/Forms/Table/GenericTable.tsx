import usePermissions from '@/hooks/usePermissions';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import React, {ReactNode, useMemo, useState} from 'react';

export type SortState = {key: string; dir: 'asc' | 'desc'};

export type RowAction<T> = {
  label: string;
  icon?: ReactNode;
  onClick: (row: T) => void;
  tone?: 'default' | 'danger';
  /** Hidden unless the user has this permission (backend still checks) */
  permission?: string;
};

type LegacyButton<T> = {
  label: string;
  onClick: (item: T) => void;
  className?: string;
  icon?: ReactNode;
};

export type Column<T> = {
  header: string;
  /** Field name: used for sorting and as the default cell value */
  key?: keyof T & string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  /** Hide this column below the given breakpoint */
  hideBelow?: 'md' | 'lg' | 'xl';
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** @deprecated use `key` or `render` */
  accessor?: keyof T | ((item: T) => ReactNode);
  /** @deprecated use `rowActions` */
  buttons?: LegacyButton<T>[];
};

export type Pagination = {page: number; limit: number; total: number};

type GenericTableProps<T> = {
  columns: Column<T>[];
  data: T[] | undefined;
  rowKey?: keyof T | ((row: T) => string);
  loading?: boolean;
  /** Dims the rows while a refetch is running (data stays visible) */
  fetching?: boolean;
  error?: unknown;
  errorTitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  emptyIcon?: ReactNode;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => RowAction<T>[];
  /** Server mode: the parent passes page / total from the API */
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizes?: number[];
  /** Server mode sorting */
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /** Search box, filter tabs, "Clear filters"… */
  toolbar?: ReactNode;
  /** Phone layout for one row; defaults to a label / value list */
  mobileCard?: (row: T) => ReactNode;
  /** Accessible table name */
  caption?: string;

  /** @deprecated client mode page size; use `pagination` */
  itemsPerPage?: number;
  /** @deprecated client-side search box */
  searchAble?: boolean;
  /** @deprecated heading above the table */
  title?: string;
  /** @deprecated use `rowActions` */
  action?: boolean;
  /** @deprecated use `rowActions` */
  onEdit?: (item: T) => void;
  /** @deprecated use `rowActions` */
  onDelete?: (item: T) => void;
  /** @deprecated client mode without paging */
  paginationOff?: boolean;
};

const HIDE_BELOW = {
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};
const ALIGN = {left: 'text-left', right: 'text-right', center: 'text-center'};

const cellValue = <T,>(row: T, column: Column<T>): ReactNode => {
  if (column.render) return column.render(row);
  if (typeof column.accessor === 'function') return column.accessor(row);
  const key = (column.key ?? column.accessor) as keyof T | undefined;
  const value = key === undefined ? undefined : row[key];
  if (value === null || value === undefined || value === '') return '–';
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return React.isValidElement(value) ? value : JSON.stringify(value);
};

const sortKey = <T,>(column: Column<T>) =>
  column.key ??
  (typeof column.accessor === 'string' ? column.accessor : undefined);

const GenericTable = <T,>({
  columns,
  data,
  rowKey,
  loading,
  fetching,
  error,
  errorTitle = 'This list could not be loaded',
  errorMessage,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  emptyAction,
  emptyIcon,
  onRowClick,
  rowActions,
  pagination,
  onPageChange,
  onLimitChange,
  pageSizes = [10, 25, 50],
  sort,
  onSortChange,
  toolbar,
  mobileCard,
  caption,
  itemsPerPage,
  searchAble,
  title,
  onEdit,
  onDelete,
  paginationOff = false,
}: GenericTableProps<T>) => {
  const {can} = usePermissions();
  const serverMode = !!pagination;

  // Client mode state (small lists and older screens)
  const [clientPage, setClientPage] = useState(1);
  const [clientLimit, setClientLimit] = useState(itemsPerPage ?? 10);
  const [clientSort, setClientSort] = useState<SortState | null>(null);
  const [query, setQuery] = useState('');

  const rows = useMemo(() => data ?? [], [data]);

  const clientRows = useMemo(() => {
    if (serverMode) return rows;
    let list = rows;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((row) =>
        columns.some((c) =>
          String(cellValue(row, c) ?? '')
            .toLowerCase()
            .includes(q),
        ),
      );
    }
    if (clientSort) {
      const k = clientSort.key as keyof T;
      const dir = clientSort.dir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) =>
        a[k] < b[k] ? -dir : a[k] > b[k] ? dir : 0,
      );
    }
    return list;
  }, [serverMode, rows, query, clientSort, columns]);

  const page = serverMode ? pagination.page : clientPage;
  const limit = serverMode ? pagination.limit : clientLimit;
  const total = serverMode ? pagination.total : clientRows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const visible =
    serverMode || paginationOff
      ? clientRows
      : clientRows.slice((page - 1) * limit, page * limit);

  const activeSort = serverMode ? sort : (clientSort ?? undefined);
  const goTo = (next: number) =>
    serverMode ? onPageChange?.(next) : setClientPage(next);
  const changeLimit = (next: number) => {
    if (serverMode) onLimitChange?.(next);
    else {
      setClientLimit(next);
      setClientPage(1);
    }
  };
  const toggleSort = (key: string) => {
    const next: SortState = {
      key,
      dir: activeSort?.key === key && activeSort.dir === 'asc' ? 'desc' : 'asc',
    };
    if (serverMode) onSortChange?.(next);
    else {
      setClientSort(next);
      setClientPage(1);
    }
  };

  const actionsFor = (row: T): RowAction<T>[] => {
    const list = rowActions ? rowActions(row) : [];
    if (onEdit) {
      list.push({label: 'Edit', icon: <Pencil size={16} />, onClick: onEdit});
    }
    if (onDelete) {
      list.push({
        label: 'Delete',
        icon: <Trash2 size={16} />,
        onClick: onDelete,
        tone: 'danger',
      });
    }
    return list.filter((a) => can(a.permission));
  };
  const hasActions = !!(rowActions || onEdit || onDelete);

  const keyOf = (row: T, index: number) =>
    typeof rowKey === 'function'
      ? rowKey(row)
      : rowKey
        ? String(row[rowKey])
        : String((row as {id?: string}).id ?? index);

  const renderActions = (row: T) => (
    <div
      className="flex justify-end gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {actionsFor(row).map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => a.onClick(row)}
          className={`btn-icon ${a.tone === 'danger' ? 'hover:text-error' : ''}`}
          aria-label={a.label}
          title={a.label}
        >
          {a.icon ?? (
            <span className="text-technical-data uppercase">{a.label}</span>
          )}
        </button>
      ))}
    </div>
  );

  const body = loading ? (
    <ul
      aria-busy="true"
      aria-label="Loading"
      className="divide-y divide-ivory-200"
    >
      {Array.from({length: 5}).map((_, i) => (
        <li key={i} className="flex animate-pulse items-center gap-4 p-4">
          <span className="h-10 w-10 rounded-full bg-ivory-200" />
          <span className="h-3 w-1/3 bg-ivory-200" />
          <span className="ml-auto hidden h-3 w-1/5 bg-ivory-200 md:block" />
        </li>
      ))}
    </ul>
  ) : error ? (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 px-6 py-16 text-center"
    >
      <p className="font-serif text-headline-sm text-burgundy">{errorTitle}</p>
      <p className="text-body-sm text-on-surface-variant">
        {errorMessage ?? 'Something went wrong.'}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost mt-2">
          Try again
        </button>
      )}
    </div>
  ) : visible.length === 0 ? (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-hairline bg-ivory-100 text-burgundy">
        {emptyIcon ?? <Inbox size={22} strokeWidth={1.5} />}
      </span>
      <p className="font-serif text-headline-sm text-burgundy">
        {query ? 'No matches' : emptyTitle}
      </p>
      {emptyMessage && !query && (
        <p className="max-w-sm text-body-sm text-on-surface-variant">
          {emptyMessage}
        </p>
      )}
      {!query && emptyAction && <div className="mt-2">{emptyAction}</div>}
    </div>
  ) : (
    <div className={fetching ? 'opacity-60 transition-opacity' : ''}>
      {/* Table for tablet and up */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-ivory-100">
            <tr className="text-label-caps uppercase text-outline">
              {columns.map((column) => {
                const k = sortKey(column);
                const sorted = activeSort && k && activeSort.key === k;
                return (
                  <th
                    key={column.header}
                    scope="col"
                    aria-sort={
                      sorted
                        ? activeSort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className={`px-4 py-3 font-semibold ${
                      column.hideBelow ? HIDE_BELOW[column.hideBelow] : ''
                    } ${ALIGN[column.align ?? 'left']} ${column.className ?? ''}`}
                  >
                    {column.sortable && k ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(k)}
                        className="inline-flex items-center gap-1 uppercase hover:text-burgundy"
                      >
                        {column.header}
                        {sorted ? (
                          activeSort.dir === 'asc' ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          )
                        ) : (
                          <ArrowUpDown size={12} className="opacity-50" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {hasActions && (
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200">
            {visible.map((row, i) => (
              <tr
                key={keyOf(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-blush/15' : ''
                } ${i % 2 ? 'bg-ivory-50' : 'bg-white'}`}
              >
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={`px-4 py-3 text-body-sm ${
                      column.hideBelow ? HIDE_BELOW[column.hideBelow] : ''
                    } ${ALIGN[column.align ?? 'left']}`}
                  >
                    {cellValue(row, column)}
                    {column.buttons && (
                      <div
                        className="mt-1.5 flex gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {column.buttons.map((b) => (
                          <button
                            key={b.label}
                            type="button"
                            onClick={() => b.onClick(row)}
                            className={`btn-text ${b.className ?? ''}`}
                          >
                            {b.icon ?? b.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                ))}
                {hasActions && (
                  <td className="px-4 py-3">{renderActions(row)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards for phones */}
      <ul className="divide-y divide-ivory-200 md:hidden">
        {visible.map((row, i) => (
          <li key={keyOf(row, i)} className="flex items-start gap-2 p-4">
            <div
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              className={`min-w-0 flex-1 ${onRowClick ? 'cursor-pointer active:bg-blush/15' : ''}`}
            >
              {mobileCard ? (
                mobileCard(row)
              ) : (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm">
                  {columns.map((column) => (
                    <React.Fragment key={column.header}>
                      <dt className="text-label-caps uppercase text-outline">
                        {column.header}
                      </dt>
                      <dd className="min-w-0 break-words text-espresso">
                        {cellValue(row, column)}
                      </dd>
                    </React.Fragment>
                  ))}
                </dl>
              )}
            </div>
            {hasActions && !mobileCard && renderActions(row)}
          </li>
        ))}
      </ul>
    </div>
  );

  const from = total ? (page - 1) * limit + 1 : 0;
  const to = paginationOff ? total : Math.min(total, page * limit);
  const showFooter = !loading && !error && total > 0 && !paginationOff;
  const canChangeLimit = serverMode ? !!onLimitChange : true;

  return (
    <div className="panel">
      {title && (
        <h2 className="border-b border-ivory-300 px-4 py-3 font-serif text-headline-sm text-burgundy">
          {title}
        </h2>
      )}
      {(toolbar || searchAble) && (
        <div className="flex flex-col gap-3 border-b border-ivory-300 p-3 md:flex-row md:items-center md:justify-between md:px-4">
          {toolbar}
          {searchAble && (
            <div className="relative md:w-80">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setClientPage(1);
                }}
                placeholder="Search…"
                aria-label="Search"
                className="field-input py-2 pl-9"
              />
            </div>
          )}
        </div>
      )}

      {body}

      {showFooter && (
        <div className="flex flex-col gap-3 border-t border-ivory-300 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-technical-data text-outline">
            <span>
              {from}–{to} of {total}
            </span>
            {canChangeLimit && (
              <label className="flex items-center gap-1.5">
                <span className="sr-only">Rows per page</span>
                <select
                  value={limit}
                  onChange={(e) => changeLimit(Number(e.target.value))}
                  className="border border-ivory-300 bg-ivory-100 px-2 py-1 text-technical-data text-espresso"
                >
                  {[...new Set([...pageSizes, limit])]
                    .sort((a, b) => a - b)
                    .map((size) => (
                      <option key={size} value={size}>
                        {size} / page
                      </option>
                    ))}
                </select>
              </label>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goTo(page - 1)}
              disabled={page <= 1}
              className="btn-icon disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-technical-data" aria-live="polite">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goTo(page + 1)}
              disabled={page >= totalPages}
              className="btn-icon disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericTable;
