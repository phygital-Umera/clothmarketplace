import EmployeeList from '@/pages/org/EmployeeList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/employees/')({
  component: () => <EmployeeList panel="shop-admin" />,
});
