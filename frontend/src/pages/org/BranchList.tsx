import {formatDate} from '@/components/Company';
import {Column, ConfirmDialog, GenericTable} from '@/components/Forms';
import {BranchEditor} from '@/components/Org/Editors';
import ListToolbar, {FilterSelect} from '@/components/Org/ListToolbar';
import {PageHeader, StatusBadge} from '@/components/ui';
import useInlineEditor from '@/hooks/useInlineEditor';
import useListState from '@/hooks/useListState';
import {useCompanies} from '@/lib/react-query/queriesAndMutations/company';
import {
  useBranches,
  useSetBranchStatus,
} from '@/lib/react-query/queriesAndMutations/org';
import {Branch, Panel} from '@/types/org';
import {getErrorMessage} from '@/utils/axios';
import {CircleCheck, CirclePause, Pencil, Plus, Store} from 'lucide-react';
import {useState} from 'react';

const baseColumns: Column<Branch>[] = [
  {
    header: 'Branch',
    key: 'name',
    sortable: true,
    render: (b) => (
      <>
        <p className="text-body-md font-medium text-espresso">{b.name}</p>
        <p className="text-technical-data uppercase text-outline">{b.code}</p>
      </>
    ),
  },
  {
    header: 'Admin',
    render: (b) =>
      b.branchAdmin ? (
        <>
          <p className="text-espresso">{b.branchAdmin.fullname}</p>
          <p className="text-technical-data text-outline">
            +91 {b.branchAdmin.phoneNumber}
          </p>
        </>
      ) : (
        <span className="text-outline">Not assigned</span>
      ),
  },
  {
    header: 'Location',
    key: 'city',
    sortable: true,
    hideBelow: 'lg',
    render: (b) => `${b.city}, ${b.state}`,
  },
  {header: 'Shops', key: 'shopCount', align: 'right', hideBelow: 'lg'},
  {header: 'Employees', key: 'employeeCount', align: 'right', hideBelow: 'lg'},
  {
    header: 'Status',
    key: 'status',
    render: (b) => <StatusBadge status={b.status} />,
  },
  {
    header: 'Added',
    key: 'createdAt',
    sortable: true,
    hideBelow: 'xl',
    render: (b) => (
      <span className="text-technical-data text-outline">
        {formatDate(b.createdAt)}
      </span>
    ),
  },
];

/**
 * Company admin: manage own branches. Super admin: read-only overview of
 * every company's branches, filterable by company.
 */
const BranchList = ({panel}: {panel: Panel}) => {
  const editable = panel === 'company-admin';
  const editor = useInlineEditor();
  const list = useListState();
  const {data, isPending, isError, error, refetch, isFetching} = useBranches(
    panel,
    list.params,
  );
  // Only the super admin filters by company
  const companies = useCompanies({page: 1, limit: 100}, !editable);
  const setStatus = useSetBranchStatus();
  const [toggle, setToggle] = useState<Branch | null>(null);

  const columns: Column<Branch>[] = editable
    ? baseColumns
    : [
        baseColumns[0],
        {header: 'Company', render: (b) => b.company.name},
        ...baseColumns.slice(1),
      ];

  const addButton = editable && (
    <button type="button" onClick={editor.openNew} className="btn-primary">
      <Plus size={14} /> Add Branch
    </button>
  );

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Branches'}]}
        title="Branches"
        actions={!editor.editing && addButton}
      />

      {editor.editing && (
        <BranchEditor
          key={editor.editing}
          id={editor.editId}
          onDone={editor.close}
        />
      )}

      <GenericTable
        caption="Branches"
        columns={columns}
        data={data?.items}
        loading={isPending}
        fetching={isFetching}
        error={isError ? error : undefined}
        errorTitle="Branches could not be loaded"
        errorMessage={getErrorMessage(error, 'Something went wrong.')}
        onRetry={() => refetch()}
        emptyIcon={<Store size={22} strokeWidth={1.5} />}
        emptyTitle={
          list.hasFilters ? 'No matching branches' : 'No branches yet'
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
        onRowClick={editable ? (b) => editor.openEdit(b.id) : undefined}
        rowActions={
          editable
            ? (b) => [
                {
                  label: 'Edit',
                  icon: <Pencil size={16} />,
                  onClick: () => editor.openEdit(b.id),
                },
                b.status === 'ACTIVE'
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
            placeholder="Search name, code or city"
          >
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
          toggle?.status === 'ACTIVE'
            ? 'Deactivate branch?'
            : 'Activate branch?'
        }
        message={
          toggle?.status === 'ACTIVE'
            ? `${toggle?.name}'s admin and employees will be signed out and cannot sign in.`
            : `${toggle?.name} will be open for its admin and employees again.`
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

export default BranchList;
