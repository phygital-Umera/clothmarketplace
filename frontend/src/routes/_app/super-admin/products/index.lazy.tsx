import ProductList from '@/pages/catalog/ProductList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/super-admin/products/')({
  component: () => <ProductList panel="super-admin" />,
});
