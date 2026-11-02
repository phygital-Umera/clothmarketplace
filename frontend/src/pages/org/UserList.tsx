import {formatDate} from '@/components/Company';
import {Column, GenericTable} from '@/components/Forms';
import ListToolbar, {FilterSelect} from '@/components/Org/ListToolbar';
import useAccountActions from '@/components/Org/useAccountActions';
import {PageHeader, StatusBadge} from '@/components/ui';
import useListState from '@/hooks/useListState';
import {useUsers} from '@/lib/react-query/queriesAndMutations/org';
import {ROLES, roleConfig} from '@/lib/roles';
import {Account} from '@/types/org';
import {getErrorMessage} from '@/utils/axios';
import {UserRound} from 'lucide-react';

const STATUS_TABS = [
  {label: 'All', value: undefined},
  {label: 'Active', value: 'ACTIVE'},
  {label: 'Inactive', value: 'INACTIVE'},
  {label: 'Blocked', value: 'BLOCKED'},
];

const ROLE_OPTIONS = Object.entries(ROLES).map(([value, r]) => ({
  value,
  label: r.label,
}));

const columns: Column<Account>[] = [
  {
    header: 'User',
    key: 'fullname',
    sortable: true,
    render: (u) => (
      <>
        <p className="text-body-md font-medium text-espresso">{u.fullname}</p>
        <p className="text-technical-data text-outline">
          {u.email ?? '–'} · +91 {u.phoneNumber}
        </p>
      </>
    ),
  },
  {
    header: 'Role',
    key: 'role',
    sortable: true,
    render: (u) => roleConfig(u.role)?.label ?? u.role,
  },
  {
    header: 'Company / Branch',
    hideBelow: 'lg',
    render: (u) =>
      u.company ? (
        <>
          <p className="text-espresso">{u.company.name}</p>
          {u.branch && (
            <p className="text-technical-data text-outline">{u.branch.name}</p>
          )}
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

/** Super admin: every account on the platform, with status actions */
const UserList = () => {
  const list = useListState();
  const {data, isPending, isError, error, refetch, isFetching} = useUsers(
    list.params,
  );
  const account = useAccountActions('super-admin');

  return (
    <>
      <PageHeader compact breadcrumbs={[{label: 'Users'}]} title="Users" />

      <GenericTable
        caption="Users"
        columns={columns}
        data={data?.items}
        loading={isPending}
        fetching={isFetching}
        error={isError ? error : undefined}
        errorTitle="Users could not be loaded"
        errorMessage={getErrorMessage(error, 'Something went wrong.')}
        onRetry={() => refetch()}
        emptyIcon={<UserRound size={22} strokeWidth={1.5} />}
        emptyTitle={list.hasFilters ? 'No matching users' : 'No users yet'}
        emptyAction={
          list.hasFilters && (
            <button type="button" onClick={list.clear} className="btn-ghost">
              Clear filters
            </button>
          )
        }
        // The platform owner's own account is not managed from here
        rowActions={(u) =>
          u.role === 'SUPER_ADMIN' ? [] : account.actionsFor(u)
        }
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
            placeholder="Search name, phone, email or ID"
          >
            <FilterSelect
              label="Roles"
              value={list.filters.role}
              onChange={(role) => list.setFilter({role})}
              options={ROLE_OPTIONS}
            />
          </ListToolbar>
        }
      />
      {account.dialog}
    </>
  );
};

export default UserList;
