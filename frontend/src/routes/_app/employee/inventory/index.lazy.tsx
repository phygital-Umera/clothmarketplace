import usePermissions from '@/hooks/usePermissions';
import InventoryList from '@/pages/ecommerce/InventoryList';
import {createLazyFileRoute} from '@tanstack/react-router';

const EmployeeInventory = () => {
  const {can} = usePermissions();
  return <InventoryList panel="employee" canAdjust={can('inventory.adjust')} />;
};

export const Route = createLazyFileRoute('/_app/employee/inventory/')({
  component: EmployeeInventory,
});
