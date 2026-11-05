import CashBookPage from '@/pages/shop/accounts/CashBookPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/cash-book')({
  component: () => <CashBookPage panel="shop-admin" />,
});
