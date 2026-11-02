import {formatDate} from '@/components/Company';
import {Column, GenericTable} from '@/components/Forms';
import ListToolbar from '@/components/Org/ListToolbar';
import {AdminEditor} from '@/components/Org/Editors';
import useAccountActions from '@/components/Org/useAccountActions';
import {PageHeader, StatusBadge} from '@/components/ui';
import useInlineEditor from '@/hooks/useInlineEditor';
import useListState from '@/hooks/useListState';
import {useUsers} from '@/lib/react-query/queriesAndMutations/org';
import {Account} from '@/types/org';
import {getErrorMessage} from '@/utils/axios';
import {Pencil, Plus, ShieldCheck} from 'lucide-react';

const STATUS_TABS = [
  {label: 'All', value: undefined},
  {label: 'Active', value: 'ACTIVE'},
  {label: 'Inactive', value: 'INACTIVE'},
  {label: 'Blocked', value: 'BLOCKED'},
];

const columns: Column<Account>[] = [
  {
    header: 'Admin',
    key: 'fullname',
    sortable: true,
    render: (u) => (
      <>
        <p className="text-body-md font-medium text-espresso">{u.fullname}</p>
        <p className="text-technical-data text-outline">+91 {u.phoneNumber}</p>
      </>
    ),
  },
  {
    header: 'Email',
    hideBelow: 'lg',
    render: (u) => <span className="truncate">{u.email ?? '–'}</span>,
  },
  {
    header: 'Business',
    render: (u) =>
      u.company ? (
        <>
          <p className="text-espresso">{u.company.name}</p>
          <p className="text-technical-data uppercase text-outline">
            {u.company.code}
          </p>
        </>
      ) : (
        '–'
      ),
  },
  {
    header: 'Status',
    key: 'status',
    sortable: true,
    render: (u) => <StatusBadge status={u.status} />,
  },
  {
    header: 'Last Login',
    key: 'lastLoginAt',
    sortable: true,
    hideBelow: 'xl',
    render: (u) => (
      <span className="text-technical-data text-outline">
        {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}
      </span>
    ),
  },
];

/**
 * Super admin: the Admins master on one page. Each admin runs one business
 * (company); the add / edit form opens above the list.
 */
const AdminList = () => {
  const editor = useInlineEditor();
  const list = useListState();
  const {data, isPending, isError, error, refetch, isFetching} = useUsers({
    ...list.params,
    role: 'ADMIN',
  });
  const account = useAccountActions('super-admin');

  const openEdit = (u: Account) => u.companyId && editor.openEdit(u.companyId);

  const addButton = (
    <button type="button" onClick={editor.openNew} className="btn-primary">
      <Plus size={14} /> Add Admin
    </button>
  );

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Admins'}]}
        title="Admins"
        actions={!editor.editing && addButton}
      />

      {editor.editing && (
        <AdminEditor
          key={editor.editing}
          id={editor.editId}
          onDone={editor.close}
        />
      )}

      <GenericTable
        caption="Admins"
        columns={columns}
        data={data?.items}
        loading={isPending}
        fetching={isFetching}
        error={isError ? error : undefined}
        errorTitle="Admins could not be loaded"
        errorMessage={getErrorMessage(error, 'Something went wrong.')}
        onRetry={() => refetch()}
        emptyIcon={<ShieldCheck size={22} strokeWidth={1.5} />}
        emptyTitle={list.hasFilters ? 'No matching admins' : 'No admins yet'}
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
        rowActions={(u) => [
          {label: 'Edit', icon: <Pencil size={16} />, onClick: openEdit},
          ...account.actionsFor(u),
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
            placeholder="Search name, phone or email"
          />
        }
      />
      {account.dialog}
    </>
  );
};

export default AdminList;
