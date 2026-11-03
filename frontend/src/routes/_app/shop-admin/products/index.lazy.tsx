import ShopProductList from '@/pages/shop/products/ShopProductList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/products/')({
  component: ShopProductList,
});
