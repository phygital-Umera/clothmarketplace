import {formatDate} from '@/components/Company';
import {Column, GenericTable} from '@/components/Forms';
import {EmployeeEditor} from '@/components/Org/Editors';
import ListToolbar, {FilterSelect} from '@/components/Org/ListToolbar';
import useAccountActions from '@/components/Org/useAccountActions';
import {PageHeader, StatusBadge} from '@/components/ui';
import useInlineEditor from '@/hooks/useInlineEditor';
import useListState from '@/hooks/useListState';
import {
  useBranchOptions,
  useEmployees,
  useShopOptions,
} from '@/lib/react-query/queriesAndMutations/org';
import {Account, Panel} from '@/types/org';
import {getErrorMessage} from '@/utils/axios';
import {useSearch} from '@tanstack/react-router';
import {Pencil, Plus, Users} from 'lucide-react';

const STATUS_TABS = [
  {label: 'All', value: undefined},
  {label: 'Active', value: 'ACTIVE'},
  {label: 'Inactive', value: 'INACTIVE'},
  {label: 'Blocked', value: 'BLOCKED'},
];

/**
 * Employees master on one page: the add / edit form (with password) opens
 * above the list. Shop login: own shop. Branch admin: own branch. Company
 * admin: the whole company.
 */
const EmployeeList = ({panel}: {panel: Panel}) => {
  const companyWide = panel === 'company-admin';
  const ownShop = panel === 'shop-admin';
  const editor = useInlineEditor();
  // Opened from a shop's "Employees" action: start filtered to that shop
  const {shopId} = useSearch({strict: false}) as {shopId?: string};
  const list = useListState({shopId});
  const {data, isPending, isError, error, refetch, isFetching} = useEmployees(
    panel,
    list.params,
  );
  const branches = useBranchOptions(companyWide);
  const shops = useShopOptions(
    panel,
    companyWide ? list.filters.branchId : undefined,
    !ownShop,
  );
  const account = useAccountActions(panel);

  const openEdit = (e: Account) => editor.openEdit(e.id);

  const columns: Column<Account>[] = [
    {
      header: 'Employee',
      key: 'fullname',
      sortable: true,
      render: (e) => (
        <>
          <p className="text-body-md font-medium text-espresso">{e.fullname}</p>
          <p className="text-technical-data uppercase text-outline">
            {e.employeeCode}
          </p>
        </>
      ),
    },
    {
      header: 'Contact',
      render: (e) => (
        <>
          <p className="truncate text-espresso">{e.email}</p>
          <p className="text-technical-data text-outline">
            +91 {e.phoneNumber}
          </p>
        </>
      ),
    },
    ...(companyWide
      ? [
          {
            header: 'Branch',
            hideBelow: 'lg',
            render: (e: Account) => e.branch?.name ?? '–',
          } as Column<Account>,
        ]
      : []),
    ...(ownShop
      ? []
      : [
          {
            header: 'Shop',
            hideBelow: 'lg',
            render: (e: Account) =>
              e.shop ? (
                e.shop.name
              ) : (
                <span className="text-outline">Not assigned</span>
              ),
          } as Column<Account>,
        ]),
    {header: 'Job Title', key: 'jobTitle', hideBelow: 'lg'},
    {
      header: 'Status',
      key: 'status',
      render: (e) => <StatusBadge status={e.status} />,
    },
    {
      header: 'Last Login',
      key: 'lastLoginAt',
      hideBelow: 'xl',
      render: (e) => (
        <span className="text-technical-data text-outline">
          {e.lastLoginAt ? formatDate(e.lastLoginAt) : 'Never'}
        </span>
      ),
    },
  ];

  const addButton = (
    <button type="button" onClick={editor.openNew} className="btn-primary">
      <Plus size={14} /> Add Employee
    </button>
  );

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Employees'}]}
        title="Employees"
        actions={!editor.editing && addButton}
      />

      {editor.editing && (
        <EmployeeEditor
          key={editor.editing}
          panel={panel}
          id={editor.editId}
          onDone={editor.close}
        />
      )}

      <GenericTable
        caption="Employees"
        columns={columns}
        data={data?.items}
        loading={isPending}
        fetching={isFetching}
        error={isError ? error : undefined}
        errorTitle="Employees could not be loaded"
        errorMessage={getErrorMessage(error, 'Something went wrong.')}
        onRetry={() => refetch()}
        emptyIcon={<Users size={22} strokeWidth={1.5} />}
        emptyTitle={
          list.hasFilters ? 'No matching employees' : 'No employees yet'
        }
        emptyAction={
          list.hasFilters ? (
            <button type="button" onClick={list.clear} className="btn-ghost">
              Clear filters
            </button>
          ) : (
            !editor.editing && addButton
          )
        }
        onRowClick={openEdit}
        rowActions={(e) => [
          {label: 'Edit', icon: <Pencil size={16} />, onClick: openEdit},
          ...account.actionsFor(e),
        ]}
        pagination={data?.pagination}
        onPageChange={list.setPage}
        sort={list.sort}
        onSortChange={list.setSort}
        toolbar={
          <ListToolbar
            tabs={STATUS_TABS}
            tab={list.filters.status}
            onTab={(status) => list.setFilter({status})}
            searchText={list.searchText}
            onSearch={list.setSearchText}
            placeholder="Search name, ID, phone or email"
          >
            {companyWide && (
              <FilterSelect
                label="Branches"
                value={list.filters.branchId}
                onChange={(branchId) =>
                  list.setFilter({branchId, shopId: undefined})
                }
                options={branches.data ?? []}
              />
            )}
            {!ownShop && (
              <FilterSelect
                label="Shops"
                value={list.filters.shopId}
                onChange={(shopId) => list.setFilter({shopId})}
                options={shops.data ?? []}
              />
            )}
          </ListToolbar>
        }
      />
      {account.dialog}
    </>
  );
};

export default EmployeeList;
