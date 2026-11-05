import SuppliersPage from '@/pages/shop/suppliers/SuppliersPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/suppliers')({
  component: () => <SuppliersPage panel="branch-admin" />,
});
