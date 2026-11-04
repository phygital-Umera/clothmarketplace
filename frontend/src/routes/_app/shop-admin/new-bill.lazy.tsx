import NewBillPOSPage from '@/pages/shop/pos/NewBillPOSPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/new-bill')({
  component: NewBillPOSPage,
});

