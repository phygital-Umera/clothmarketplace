import InventoryList from '@/pages/ecommerce/InventoryList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/stock-adjustment')({
  component: () => <InventoryList panel="shop-admin" />,
});
