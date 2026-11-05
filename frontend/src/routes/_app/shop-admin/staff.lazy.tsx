import StaffRightsPage from '@/pages/shop/staff/StaffRightsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/staff')({
  component: () => <StaffRightsPage panel="shop-admin" />,
});
