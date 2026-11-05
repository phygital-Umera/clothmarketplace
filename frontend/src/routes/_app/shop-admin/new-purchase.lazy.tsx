import BranchPurchaseBillsPage from '@/pages/branch/BranchPurchaseBillsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/new-purchase')({
  component: () => <BranchPurchaseBillsPage initialMode="NEW" />,
});

