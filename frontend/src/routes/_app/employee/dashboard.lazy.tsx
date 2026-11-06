import EmployeeHomePage from '@/pages/employee/EmployeeHomePage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/employee/dashboard')({
  component: EmployeeHomePage,
});
