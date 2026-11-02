import EmployeeList from '@/pages/org/EmployeeList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/company-admin/employees/')({
  component: () => <EmployeeList panel="company-admin" />,
});
