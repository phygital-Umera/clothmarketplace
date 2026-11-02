import {formatDate} from '@/components/Company';
import {Column, ConfirmDialog, GenericTable} from '@/components/Forms';
import {ShopEditor} from '@/components/Org/Editors';
import ListToolbar, {FilterSelect} from '@/components/Org/ListToolbar';
import {PageHeader, StatusBadge} from '@/components/ui';
import useInlineEditor from '@/hooks/useInlineEditor';
import useListState from '@/hooks/useListState';
import {useCompanies} from '@/lib/react-query/queriesAndMutations/company';
import {
  useBranchOptions,
  useSetShopStatus,
  useShops,
} from '@/lib/react-query/queriesAndMutations/org';
import {Panel, Shop} from '@/types/org';
import {getErrorMessage} from '@/utils/axios';
import {useSearch} from '@tanstack/react-router';
import {CircleCheck, CirclePause, Pencil, Plus, Store} from 'lucide-react';
import {useState} from 'react';

/**
 * Shops master on one page: the add / edit form (with the shop login) opens
 * above the list. Branch admin: own branch. Company admin: every branch.
 * Super admin: read-only overview.
 */
const ShopList = ({panel}: {panel: Panel}) => {
  const editable = panel !== 'super-admin';
  const companyWide = panel === 'company-admin';
  // Branch admins land here after sign-in with the Add Shop form open
  const {add} = useSearch({strict: false}) as {add?: string};
  const editor = useInlineEditor(editable && !!add);
  const list = useListState();
  const {data, isPending, isError, error, refetch, isFetching} = useShops(
    panel,
    list.params,
  );
  const branches = useBranchOptions(companyWide);
  // Only the super admin filters by company
  const companies = useCompanies({page: 1, limit: 100}, !editable);
  const setStatus = useSetShopStatus(panel);
  const [toggle, setToggle] = useState<Shop | null>(null);

  const columns: Column<Shop>[] = [
    {
      header: 'Shop',
      key: 'name',
      sortable: true,
      render: (s) => (
        <>
          <p className="text-body-md font-medium text-espresso">{s.name}</p>
          <p className="text-technical-data uppercase text-outline">{s.code}</p>
        </>
      ),
    },
    ...(panel === 'super-admin'
      ? [
          {
            header: 'Company',
            render: (s: Shop) => s.company.name,
          } as Column<Shop>,
        ]
      : []),
    ...(panel !== 'branch-admin'
      ? [
          {
            header: 'Branch',
            render: (s: Shop) => s.branch.name,
          } as Column<Shop>,
        ]
      : []),
    {
      header: 'Login',
      render: (s) =>
        s.shopAdmin ? (
          <>
            <p className="text-espresso">{s.shopAdmin.fullname}</p>
            <p className="text-technical-data text-outline">
              +91 {s.shopAdmin.phoneNumber}
            </p>
          </>
        ) : (
          <span className="text-outline">No login</span>
        ),
    },
    {header: 'Employees', key: 'employeeCount', align: 'right'},
    {
      header: 'Status',
      key: 'status',
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      header: 'Added',
      key: 'createdAt',
      sortable: true,
      hideBelow: 'xl',
      render: (s) => (
        <span className="text-technical-data text-outline">
          {formatDate(s.createdAt)}
        </span>
      ),
    },
  ];

  const addButton = editable && (
    <button type="button" onClick={editor.openNew} className="btn-primary">
      <Plus size={14} /> Add Shop
    </button>
  );

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Shops'}]}
        title="Shops"
        actions={!editor.editing && addButton}
      />

      {editor.editing && (
        <ShopEditor
          key={editor.editing}
          panel={panel}
          id={editor.editId}
          onDone={editor.close}
        />
      )}

      <GenericTable
        caption="Shops"
        columns={columns}
        data={data?.items}
        loading={isPending}
        fetching={isFetching}
        error={isError ? error : undefined}
        errorTitle="Shops could not be loaded"
        errorMessage={getErrorMessage(error, 'Something went wrong.')}
        onRetry={() => refetch()}
        emptyIcon={<Store size={22} strokeWidth={1.5} />}
        emptyTitle={list.hasFilters ? 'No matching shops' : 'No shops yet'}
        emptyAction={
          list.hasFilters ? (
            <button type="button" onClick={list.clear} className="btn-ghost">
              Clear filters
            </button>
          ) : (
            !editor.editing && addButton
          )
        }
        onRowClick={editable ? (s) => editor.openEdit(s.id) : undefined}
        rowActions={
          editable
            ? (s) => [
                {
                  label: 'Edit',
                  icon: <Pencil size={16} />,
                  onClick: () => editor.openEdit(s.id),
                },
                s.status === 'ACTIVE'
                  ? {
                      label: 'Deactivate',
                      icon: <CirclePause size={16} />,
                      onClick: setToggle,
                      tone: 'danger',
                    }
                  : {
                      label: 'Activate',
                      icon: <CircleCheck size={16} />,
                      onClick: setToggle,
                    },
              ]
            : undefined
        }
        pagination={data?.pagination}
        onPageChange={list.setPage}
        sort={list.sort}
        onSortChange={list.setSort}
        toolbar={
          <ListToolbar
            tabs={[
              {label: 'All', value: undefined, count: data?.summary?.total},
              {label: 'Active', value: 'ACTIVE', count: data?.summary?.active},
              {
                label: 'Inactive',
                value: 'INACTIVE',
                count: data?.summary?.inactive,
              },
            ]}
            tab={list.filters.status}
            onTab={(status) => list.setFilter({status})}
            searchText={list.searchText}
            onSearch={list.setSearchText}
            placeholder="Search name, code or phone"
          >
            {companyWide && (
              <FilterSelect
                label="Branches"
                value={list.filters.branchId}
                onChange={(branchId) => list.setFilter({branchId})}
                options={branches.data ?? []}
              />
            )}
            {!editable && (
              <FilterSelect
                label="Companies"
                value={list.filters.companyId}
                onChange={(companyId) => list.setFilter({companyId})}
                options={(companies.data?.items ?? []).map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
            )}
          </ListToolbar>
        }
      />

      <ConfirmDialog
        open={!!toggle}
        title={
          toggle?.status === 'ACTIVE' ? 'Deactivate shop?' : 'Activate shop?'
        }
        message={
          toggle?.status === 'ACTIVE'
            ? `${toggle?.name}'s login and employees will be signed out and cannot sign in.`
            : `${toggle?.name}'s login and employees can sign in again.`
        }
        confirmLabel={toggle?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        tone={toggle?.status === 'ACTIVE' ? 'danger' : 'default'}
        requireReason={toggle?.status === 'ACTIVE'}
        isLoading={setStatus.isPending}
        onCancel={() => setToggle(null)}
        onConfirm={async (reason) => {
          if (!toggle) return;
          await setStatus
            .mutateAsync({
              id: toggle.id,
              status: toggle.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
              reason,
            })
            .catch(() => undefined);
          setToggle(null);
        }}
      />
    </>
  );
};

export default ShopList;
