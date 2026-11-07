import ShopExpensesPage from '@/pages/shop/ShopExpensesPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/expenses')({
  component: ShopExpensesPage,
});
