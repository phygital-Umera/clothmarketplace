import ProductFormPage from '@/pages/catalog/ProductFormPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/employee/products/$productId')({
  component: () => <ProductFormPage panel="employee" />,
});
