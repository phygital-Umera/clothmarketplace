import ShopProductDetail from '@/pages/shop/products/ShopProductDetail';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute(
  '/_app/shop-admin/products/$productId',
)({
  component: ShopProductDetail,
});
