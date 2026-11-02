import OrderList from '@/pages/ecommerce/OrderList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/employee/orders/')({
  component: () => <OrderList panel="employee" />,
});
