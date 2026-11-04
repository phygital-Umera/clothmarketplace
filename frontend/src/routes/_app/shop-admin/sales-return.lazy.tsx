import SalesReturnPage from '@/pages/shop/returns/SalesReturnPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/sales-return')({
  component: SalesReturnPage,
});

