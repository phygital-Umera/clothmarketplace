import StockPage from '@/pages/shop/stock/StockPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/stock')({
  component: () => <StockPage panel="branch-admin" />,
});

