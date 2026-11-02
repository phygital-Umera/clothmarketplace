import OrderList from '@/pages/ecommerce/OrderList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/company-admin/orders/')({
  component: () => <OrderList panel="company-admin" />,
});
