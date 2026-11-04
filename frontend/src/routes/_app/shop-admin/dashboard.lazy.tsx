import ShopDashboard from '@/pages/shop/dashboard/ShopDashboard';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/dashboard')({
  component: ShopDashboard,
});
