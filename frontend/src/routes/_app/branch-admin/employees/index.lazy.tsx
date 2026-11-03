import EmployeeList from '@/pages/org/EmployeeList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/employees/')({
  component: () => <EmployeeList panel="branch-admin" />,
});
