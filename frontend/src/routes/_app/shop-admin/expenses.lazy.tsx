import BranchExpensesPage from '@/pages/branch/BranchExpensesPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/expenses')({
  component: BranchExpensesPage,
});

