import ShopProductForm from '@/pages/shop/products/ShopProductForm';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/products/new')({
  component: ShopProductForm,
});
