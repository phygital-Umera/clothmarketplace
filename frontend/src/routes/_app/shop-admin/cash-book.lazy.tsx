import BranchCashDayClosePage from '@/pages/branch/BranchCashDayClosePage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/cash-book')({
  component: BranchCashDayClosePage,
});

