import ProductFormPage from '@/pages/catalog/ProductFormPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/products/new')({
  component: () => <ProductFormPage panel="branch-admin" />,
});
