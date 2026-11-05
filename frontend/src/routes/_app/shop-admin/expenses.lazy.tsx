import ShopExpensesPage from '@/pages/shop/accounts/ShopExpensesPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/expenses')({
  component: () => <ShopExpensesPage panel="shop-admin" />,
});
