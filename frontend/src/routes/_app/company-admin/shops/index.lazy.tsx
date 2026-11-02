import ShopList from '@/pages/org/ShopList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/company-admin/shops/')({
  component: () => <ShopList panel="company-admin" />,
});
