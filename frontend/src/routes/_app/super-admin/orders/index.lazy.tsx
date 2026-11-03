import OrderList from '@/pages/ecommerce/OrderList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/super-admin/orders/')({
  component: () => <OrderList panel="super-admin" />,
});
