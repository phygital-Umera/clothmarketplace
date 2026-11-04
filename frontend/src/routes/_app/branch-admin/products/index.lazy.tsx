import BranchProductPricingPage from '@/pages/branch/BranchProductPricingPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/products/')({
  component: BranchProductPricingPage,
});
