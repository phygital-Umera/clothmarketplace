import StockAdjustmentPage from '@/pages/shop/stock/StockAdjustmentPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/stock-adjustment')({
  component: () => <StockAdjustmentPage panel="shop-admin" />,
});
