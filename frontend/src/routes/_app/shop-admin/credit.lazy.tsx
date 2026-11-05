import CreditUdhaarPage from '@/pages/shop/credit/CreditUdhaarPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/credit')({
  component: CreditUdhaarPage,
});

