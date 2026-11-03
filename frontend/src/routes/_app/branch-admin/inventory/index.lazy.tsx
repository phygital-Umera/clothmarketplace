import InventoryList from '@/pages/ecommerce/InventoryList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/inventory/')({
  component: () => <InventoryList panel="branch-admin" />,
});
