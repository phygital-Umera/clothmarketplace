import ShopSalesReturnsPage from '@/pages/shop/returns/ShopSalesReturnsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/sales-returns/')({
  component: ShopSalesReturnsPage,
});
