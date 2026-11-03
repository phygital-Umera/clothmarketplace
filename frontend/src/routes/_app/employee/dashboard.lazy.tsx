import usePermissions from '@/hooks/usePermissions';
import {AccountDashboard} from '@/pages/dashboards';
import {EMPLOYEE_PERMISSIONS} from '@/types/org';
import {createLazyFileRoute} from '@tanstack/react-router';

/** Employee home: their details plus the tools their permissions give them */
const EmployeeDashboard = () => {
  const {permissions} = usePermissions();
  const tools = EMPLOYEE_PERMISSIONS.filter((p) =>
    permissions.includes(p.value),
  ).map((p) => p.label);
  return (
    <AccountDashboard
      title="Employee dashboard"
      note={
        tools.length
          ? `Your access: ${tools.join(', ')}. Open your tools from the menu.`
          : 'Your admin has not given you any tools yet. Ask them to set your permissions.'
      }
    />
  );
};

export const Route = createLazyFileRoute('/_app/employee/dashboard')({
  component: EmployeeDashboard,
});
