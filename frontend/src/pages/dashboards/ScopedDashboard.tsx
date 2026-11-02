import {PageHeader, StatCard, StatusBadge} from '@/components/ui';
import useCurrentUser from '@/hooks/useCurrentUser';
import {useScopedDashboard} from '@/lib/react-query/queriesAndMutations/org';
import {Panel} from '@/types/org';
import {Link} from '@tanstack/react-router';

/** Company admin and branch admin dashboards: real counts in their scope */
const ScopedDashboard = ({panel}: {panel: Exclude<Panel, 'super-admin'>}) => {
  const {data: me} = useCurrentUser();
  const {data, isError} = useScopedDashboard(panel);
  const companyWide = panel === 'company-admin';
  const employeesPath = companyWide
    ? '/company-admin/employees'
    : '/branch-admin/employees';

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Overview'}]}
        title={
          (companyWide ? me?.company?.name : me?.branch?.name) ?? 'Dashboard'
        }
      />

      {isError && (
        <p role="alert" className="mb-4 text-body-sm text-error">
          Dashboard figures could not be loaded.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {companyWide && (
          <>
            <StatCard label="Branches" value={data?.branches} />
            <StatCard label="Active Branches" value={data?.activeBranches} />
            <StatCard label="Branch Admins" value={data?.branchAdmins} />
          </>
        )}
        <StatCard label="Shops" value={data?.shops} />
        <StatCard label="Employees" value={data?.employees} />
        <StatCard label="Active Employees" value={data?.activeEmployees} />
        {!companyWide && (
          <StatCard label="Active Shops" value={data?.activeShops} />
        )}
      </div>

      <section className="panel mt-4 p-4 md:p-5">
        <div className="mb-2 flex items-center justify-between border-b border-ivory-300 pb-1.5">
          <h2 className="text-label-caps uppercase text-burgundy">
            Recent employees
          </h2>
          <Link to={employeesPath} className="btn-text">
            View all
          </Link>
        </div>
        {data?.recentEmployees.length ? (
          <ul className="divide-y divide-ivory-200">
            {data.recentEmployees.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm text-espresso">
                    {e.fullname}
                  </p>
                  <p className="text-technical-data uppercase text-outline">
                    {e.employeeCode}
                    {companyWide && e.branch ? ` · ${e.branch.name}` : ''}
                  </p>
                </div>
                <StatusBadge status={e.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-body-sm text-on-surface-variant">
            No employees yet.
          </p>
        )}
      </section>
    </>
  );
};

export default ScopedDashboard;
