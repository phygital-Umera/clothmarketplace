import SuppliersPage from '@/pages/shop/suppliers/SuppliersPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/suppliers')({
  component: SuppliersPage,
});

