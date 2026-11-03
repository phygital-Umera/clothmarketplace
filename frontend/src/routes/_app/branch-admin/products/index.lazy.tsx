import ProductList from '@/pages/catalog/ProductList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/products/')({
  component: () => <ProductList panel="branch-admin" />,
});
