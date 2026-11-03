import ProductList from '@/pages/catalog/ProductList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/company-admin/products/')({
  component: () => <ProductList panel="company-admin" />,
});
