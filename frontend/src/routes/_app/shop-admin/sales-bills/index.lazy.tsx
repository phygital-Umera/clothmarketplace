import BillsPage from '@/pages/shop/bills/BillsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/sales-bills/')({
  component: () => <BillsPage panel="shop-admin" kind="sales" />,
});
