import {CompanyList} from '@/pages/companies';
import type {CompanySearch} from '@/pages/companies/CompanyList';
import {COMPANY_SORT_FIELDS, CompanySortField} from '@/types/company';
import {createFileRoute} from '@tanstack/react-router';

const toPositiveInt = (value: unknown) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export const Route = createFileRoute('/_app/super-admin/companies/')({
  validateSearch: (search: Record<string, unknown>): CompanySearch => ({
    page: toPositiveInt(search.page),
    limit: toPositiveInt(search.limit),
    search: typeof search.search === 'string' ? search.search : undefined,
    status:
      search.status === 'ACTIVE' || search.status === 'INACTIVE'
        ? search.status
        : undefined,
    sortBy: COMPANY_SORT_FIELDS.includes(search.sortBy as CompanySortField)
      ? (search.sortBy as CompanySortField)
      : undefined,
    sortDir:
      search.sortDir === 'asc' || search.sortDir === 'desc'
        ? search.sortDir
        : undefined,
  }),
  component: CompanyList,
});
