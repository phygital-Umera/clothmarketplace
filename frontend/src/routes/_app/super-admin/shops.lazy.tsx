import ShopList from '@/pages/org/ShopList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/super-admin/shops')({
  component: () => <ShopList panel="super-admin" />,
});
