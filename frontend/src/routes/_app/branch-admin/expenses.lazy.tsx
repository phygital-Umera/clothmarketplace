import ShopExpensesPage from '@/pages/shop/accounts/ShopExpensesPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/expenses')({
  component: () => <ShopExpensesPage panel="branch-admin" />,
});
