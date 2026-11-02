import OrderList from '@/pages/ecommerce/OrderList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/orders/')({
  component: () => <OrderList panel="branch-admin" />,
});
