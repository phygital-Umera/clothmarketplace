import ShopOrdersPage from '@/pages/orders/ShopOrdersPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/orders/')({
  component: () => <ShopOrdersPage panel="branch-admin" />,
});
