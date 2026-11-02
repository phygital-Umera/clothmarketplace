import ProductFormPage from '@/pages/catalog/ProductFormPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute(
  '/_app/super-admin/products/$productId',
)({
  component: () => <ProductFormPage panel="super-admin" />,
});
