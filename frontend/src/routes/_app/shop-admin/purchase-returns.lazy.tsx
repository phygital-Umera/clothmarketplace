import PurchaseReturnPage from '@/pages/shop/returns/PurchaseReturnPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/purchase-returns')({
  component: PurchaseReturnPage,
});

