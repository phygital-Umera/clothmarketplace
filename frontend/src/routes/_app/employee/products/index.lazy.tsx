import ProductList from '@/pages/catalog/ProductList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/employee/products/')({
  component: () => <ProductList panel="employee" />,
});
