import ProductFormPage from '@/pages/catalog/ProductFormPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/company-admin/products/new')({
  component: () => <ProductFormPage panel="company-admin" />,
});
