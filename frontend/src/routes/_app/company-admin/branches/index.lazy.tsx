import BranchList from '@/pages/org/BranchList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/company-admin/branches/')({
  component: () => <BranchList panel="company-admin" />,
});
