import CustomerPage from '@/pages/shop/customers/CustomerPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/customers')({
  component: CustomerPage,
});

