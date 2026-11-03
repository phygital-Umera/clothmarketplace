import BranchList from '@/pages/org/BranchList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/super-admin/branches')({
  component: () => <BranchList panel="super-admin" />,
});
