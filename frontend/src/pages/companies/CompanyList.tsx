import {
  CompanyAvatar,
  CompanyDetailsDrawer,
  formatDate,
  StatusBadge,
} from '@/components/Company';
import {
  Column,
  ConfirmDialog,
  GenericTable,
  GenericTabs,
} from '@/components/Forms';
import {PageHeader} from '@/components/ui';
import useDebounce from '@/hooks/useDebounce';
import usePermissions from '@/hooks/usePermissions';
import {
  useCompanies,
  useDeleteCompany,
} from '@/lib/react-query/queriesAndMutations/company';
import {Company, CompanySortField, CompanyStatus} from '@/types/company';
import {getErrorMessage} from '@/utils/axios';
import {Link, useNavigate, useSearch} from '@tanstack/react-router';
import {Building2, Pencil, Plus, Search, Trash2, X} from 'lucide-react';
import {useEffect, useState} from 'react';

export type CompanySearch = {
  page?: number;
  limit?: number;
  search?: string;
  status?: CompanyStatus;
  sortBy?: CompanySortField;
  sortDir?: 'asc' | 'desc';
};

const columns: Column<Company>[] = [
  {
    header: 'Company',
    key: 'name',
    sortable: true,
    render: (company) => (
      <div className="flex items-center gap-3">
        <CompanyAvatar company={company} />
        <div className="min-w-0">
          <p className="truncate text-body-md font-medium text-espresso">
            {company.name}
          </p>
          <p className="text-technical-data uppercase text-outline">
            {company.code}
          </p>
        </div>
      </div>
    ),
  },
  {
    header: 'Contact',
    render: (company) => (
      <>
        <p className="truncate text-espresso">{company.email}</p>
        <p className="text-technical-data text-outline">
          +91 {company.contactNumber}
        </p>
      </>
    ),
  },
  {
    header: 'Location',
    key: 'city',
    sortable: true,
    hideBelow: 'lg',
    render: (company) => `${company.city}, ${company.state}`,
  },
  {
    header: 'Administrator',
    hideBelow: 'xl',
    render: (company) => (
      <>
        <p className="text-espresso">{company.adminName}</p>
        <p className="text-technical-data text-outline">{company.adminEmail}</p>
      </>
    ),
  },
  {
    header: 'Status',
    key: 'status',
    render: (company) => <StatusBadge status={company.status} />,
  },
  {
    header: 'Added',
    key: 'createdAt',
    sortable: true,
    hideBelow: 'xl',
    render: (company) => (
      <span className="whitespace-nowrap text-technical-data text-outline">
        {formatDate(company.createdAt)}
      </span>
    ),
  },
];

const CompanyList = () => {
  const navigate = useNavigate({from: '/super-admin/companies'});
  const {
    page = 1,
    limit = 10,
    search = '',
    status,
    sortBy,
    sortDir,
  } = useSearch({
    from: '/_app/super-admin/companies/',
  });
  const {can} = usePermissions();

  const [searchText, setSearchText] = useState(search);
  const debouncedSearch = useDebounce(searchText, 300);
  const [selected, setSelected] = useState<Company | null>(null);
  const [toDelete, setToDelete] = useState<Company | null>(null);

  // Filters live in the URL, so back/forward and refresh keep them
  const setSearch = (next: CompanySearch) =>
    navigate({
      search: (prev: CompanySearch) => ({...prev, ...next}),
      replace: true,
    });

  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch({search: debouncedSearch || undefined, page: undefined});
    }
  }, [debouncedSearch]);

  const {data, isPending, isError, error, refetch, isFetching} = useCompanies({
    page,
    limit,
    search: search || undefined,
    status,
    sortBy,
    sortDir,
  });
  const deleteMutation = useDeleteCompany();

  const companies = data?.items ?? [];
  const summary = data?.summary;
  const hasFilters = !!search || !!status;

  const clearFilters = () => {
    setSearchText('');
    setSearch({search: undefined, status: undefined, page: undefined});
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteMutation.mutateAsync(toDelete.id).catch(() => undefined);
    setToDelete(null);
    setSelected(null);
    // Step back if we just removed the last row on this page
    if (companies.length === 1 && page > 1) setSearch({page: page - 1});
  };

  const addButton = can('companies.create') && (
    <Link to="/super-admin/companies/new" className="btn-primary">
      <Plus size={14} /> Add Company
    </Link>
  );

  return (
    <>
      <PageHeader
        breadcrumbs={[
          {label: 'Dashboard', to: '/super-admin/dashboard'},
          {label: 'Companies'},
        ]}
        title="Companies"
        subtitle="Every clothing company registered on the platform."
        actions={addButton}
      />

      <GenericTable
        caption="Companies"
        columns={columns}
        data={companies}
        rowKey="id"
        loading={isPending}
        fetching={isFetching}
        error={isError ? error : undefined}
        errorTitle="Companies could not be loaded"
        errorMessage={getErrorMessage(error, 'Something went wrong.')}
        onRetry={() => refetch()}
        emptyIcon={<Building2 size={22} strokeWidth={1.5} />}
        emptyTitle={hasFilters ? 'No matching companies' : 'No companies yet'}
        emptyMessage={
          hasFilters
            ? 'Try a different search or status.'
            : 'Register the first clothing company to start onboarding them onto the platform.'
        }
        emptyAction={
          hasFilters ? (
            <button type="button" onClick={clearFilters} className="btn-ghost">
              Clear filters
            </button>
          ) : (
            addButton
          )
        }
        onRowClick={setSelected}
        rowActions={(company) => [
          {
            label: `Edit ${company.name}`,
            icon: <Pencil size={16} />,
            onClick: () =>
              navigate({
                to: '/super-admin/companies/$companyId/edit',
                params: {companyId: company.id},
              }),
            permission: 'companies.edit',
          },
          {
            label: `Delete ${company.name}`,
            icon: <Trash2 size={16} />,
            onClick: setToDelete,
            tone: 'danger',
            permission: 'companies.delete',
          },
        ]}
        pagination={data?.pagination}
        onPageChange={(next) => setSearch({page: next})}
        sort={sortBy ? {key: sortBy, dir: sortDir ?? 'asc'} : undefined}
        onSortChange={({key, dir}) =>
          setSearch({
            sortBy: key as CompanySortField,
            sortDir: dir,
            page: undefined,
          })
        }
        mobileCard={(company) => (
          <div className="flex items-center gap-3">
            <CompanyAvatar company={company} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-espresso">
                {company.name}
              </p>
              <p className="truncate text-technical-data uppercase text-outline">
                {company.code} · {company.city}
              </p>
            </div>
            <StatusBadge status={company.status} />
          </div>
        )}
        toolbar={
          <>
            {/* Status tabs double as the summary counts */}
            <GenericTabs<CompanyStatus | undefined>
              label="Filter by status"
              value={status}
              onChange={(value) => setSearch({status: value, page: undefined})}
              tabs={[
                {label: 'All', value: undefined, count: summary?.total},
                {label: 'Active', value: 'ACTIVE', count: summary?.active},
                {
                  label: 'Inactive',
                  value: 'INACTIVE',
                  count: summary?.inactive,
                },
              ]}
            />

            <div className="relative md:w-80">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              />
              <input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search name, code, city or admin"
                aria-label="Search companies"
                className="field-input py-2 pl-9 pr-9"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-outline hover:text-burgundy"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </>
        }
      />

      <CompanyDetailsDrawer
        company={selected}
        onClose={() => setSelected(null)}
        onDelete={setToDelete}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this company?"
        message={`${toDelete?.name ?? 'This company'} will be removed from the platform. This cannot be undone.`}
        confirmLabel="Delete company"
        tone="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
};

export default CompanyList;
