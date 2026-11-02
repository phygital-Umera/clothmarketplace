import InventoryList from '@/pages/ecommerce/InventoryList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/company-admin/inventory/')({
  component: () => <InventoryList panel="company-admin" />,
});
