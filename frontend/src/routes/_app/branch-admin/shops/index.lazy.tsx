import ShopList from '@/pages/org/ShopList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/shops/')({
  component: () => <ShopList panel="branch-admin" />,
});
