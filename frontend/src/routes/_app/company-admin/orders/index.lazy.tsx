import ShopOrdersPage from '@/pages/orders/ShopOrdersPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/company-admin/orders/')({
  component: () => <ShopOrdersPage panel="company-admin" />,
});
