import {GenericTabs} from '@/components/Forms';
import {Search, X} from 'lucide-react';
import {ReactNode} from 'react';

type ListToolbarProps = {
  tabs?: {label: string; value: string | undefined; count?: number}[];
  tab?: string;
  onTab?: (value?: string) => void;
  searchText: string;
  onSearch: (text: string) => void;
  placeholder: string;
  /** Extra filters (selects) between the tabs and the search box */
  children?: ReactNode;
};

/** Status tabs + filters + search, shared by the admin lists */
const ListToolbar = ({
  tabs,
  tab,
  onTab,
  searchText,
  onSearch,
  placeholder,
  children,
}: ListToolbarProps) => (
  <>
    {tabs && onTab && (
      <GenericTabs<string | undefined>
        label="Filter by status"
        value={tab}
        onChange={onTab}
        tabs={tabs}
      />
    )}
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center md:ml-auto">
      {children}
      <div className="relative sm:w-72">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
        />
        <input
          type="search"
          value={searchText}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="field-input py-2 pl-9 pr-9"
        />
        {searchText && (
          <button
            type="button"
            onClick={() => onSearch('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-outline hover:text-burgundy"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  </>
);

/** Plain select used as a list filter (not a form field) */
export const FilterSelect = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value?: string;
  onChange: (value?: string) => void;
  options: {value: string; label: string}[];
}) => (
  <select
    aria-label={label}
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value || undefined)}
    className="field-input py-2 sm:w-48"
  >
    <option value="">All {label.toLowerCase()}</option>
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

export default ListToolbar;
