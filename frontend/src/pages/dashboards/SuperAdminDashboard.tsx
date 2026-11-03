import {formatDate} from '@/components/Company';
import {PageHeader, StatCard, StatusBadge} from '@/components/ui';
import {useSuperAdminDashboard} from '@/lib/react-query/queriesAndMutations/org';
import {Link} from '@tanstack/react-router';
import {ReactNode} from 'react';

const Recent = ({
  title,
  to,
  children,
}: {
  title: string;
  to: string;
  children: ReactNode;
}) => (
  <section className="panel p-4 md:p-5">
    <div className="mb-2 flex items-center justify-between border-b border-ivory-300 pb-1.5">
      <h2 className="text-label-caps uppercase text-burgundy">{title}</h2>
      <Link to={to} className="btn-text">
        View all
      </Link>
    </div>
    <ul className="divide-y divide-ivory-200">{children}</ul>
  </section>
);

const Row = ({
  name,
  sub,
  status,
}: {
  name: string;
  sub: string;
  status: string;
}) => (
  <li className="flex items-center gap-3 py-2">
    <div className="min-w-0 flex-1">
      <p className="truncate text-body-sm text-espresso">{name}</p>
      <p className="truncate text-technical-data text-outline">{sub}</p>
    </div>
    <StatusBadge status={status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'} />
  </li>
);

/** Platform overview, all from real records */
const SuperAdminDashboard = () => {
  const {data, isError} = useSuperAdminDashboard();

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Overview'}]}
        title="Dashboard"
      />

      {isError && (
        <p role="alert" className="mb-4 text-body-sm text-error">
          Dashboard figures could not be loaded.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Companies" value={data?.companies.total} />
        <StatCard label="Active Companies" value={data?.companies.active} />
        <StatCard label="Branches" value={data?.branches.total} />
        <StatCard label="Active Branches" value={data?.branches.active} />
        <StatCard label="Shops" value={data?.shops.total} />
        <StatCard label="Active Shops" value={data?.shops.active} />
        <StatCard label="Company Admins" value={data?.users.companyAdmins} />
        <StatCard label="Branch Admins" value={data?.users.branchAdmins} />
        <StatCard label="Employees" value={data?.users.employees} />
        <StatCard label="Customers" value={data?.users.customers} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Recent title="Recent companies" to="/super-admin/companies">
          {data?.recentCompanies.map((c) => (
            <Row
              key={c.id}
              name={c.name}
              sub={`${c.code} · ${c.city} · ${formatDate(c.createdAt)}`}
              status={c.status}
            />
          ))}
        </Recent>
        <Recent title="Recent branches" to="/super-admin/branches">
          {data?.recentBranches.map((b) => (
            <Row
              key={b.id}
              name={b.name}
              sub={`${b.company.name} · ${b.city} · ${formatDate(b.createdAt)}`}
              status={b.status}
            />
          ))}
        </Recent>
      </div>
    </>
  );
};

export default SuperAdminDashboard;
