import BranchCashDayClosePage from '@/pages/branch/BranchCashDayClosePage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/day-close')({
  component: BranchCashDayClosePage,
});
