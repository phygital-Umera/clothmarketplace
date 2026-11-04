import BranchStaffPage from '@/pages/branch/BranchStaffPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/employees/')({
  component: BranchStaffPage,
});
