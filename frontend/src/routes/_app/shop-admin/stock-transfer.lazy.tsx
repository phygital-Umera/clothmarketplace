import StockTransferPage from '@/pages/shop/stock/StockTransferPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/stock-transfer')({
  component: () => <StockTransferPage panel="shop-admin" />,
});
