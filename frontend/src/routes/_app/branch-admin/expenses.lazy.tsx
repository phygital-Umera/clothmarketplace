import BranchExpensesPage from '@/pages/branch/BranchExpensesPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/expenses')({
  component: BranchExpensesPage,
});
