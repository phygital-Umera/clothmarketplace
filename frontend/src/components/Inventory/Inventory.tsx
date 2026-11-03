/* eslint-disable  */
import React, {useEffect} from 'react';
import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {
  useDeleteInventory,
  useGetInventoryData,
} from '@/lib/react-query/queriesAndMutations/cateror/inventorydata';
import {useNavigate} from '@tanstack/react-router';

// Define the structure of inventory data
interface InventoryItem {
  id: string;
  rawMaterial: string;
  category: string;
  quantity: number;
  unit: string;
  date: string;
}

const columns: Column<InventoryItem>[] = [
  {header: 'Date', accessor: 'date'},
  {header: 'Raw Material', accessor: 'rawMaterial'},
  {header: 'Category', accessor: 'category'},
  {header: 'Quantity', accessor: 'quantity'},
  {header: 'Unit', accessor: 'unit'},
];

const Inventory: React.FC = () => {
  const {
    data: inventoryData,
    isPending,
    isError,
    refetch,
  } = useGetInventoryData();
  console.log('Inventory data ::', inventoryData);
  // const {mutate: deleteInventory} = useDeleteInventory();

  const navigate = useNavigate();

  // Transform fetched data
  const transformData = (inventoryData: any): InventoryItem[] => {
    if (!inventoryData || !inventoryData.data?.inventories) return [];

    return inventoryData.data.inventories.map((item: any) => ({
      id: item.id,
      rawMaterial: item.name,
      category: item.category.name,
      quantity: item.inventory.toFixed(2),
      unit: item.unit,
      date: new Date().toISOString().split('T')[0], // Placeholder date
    }));
  };

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Handle Edit button click
  const handleEdit = (items: InventoryItem) => {
    navigate({
      to: `/updateinventory/${items.id}`,
    });
  };

  const data = transformData(inventoryData);

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error fetching data</div>;
  }

  return (
    <div>
      <GenericTable
        title="Product Inventory"
        data={data}
        columns={columns}
        itemsPerPage={5}
        action
        // onDelete={handleDelete}
        onEdit={handleEdit}
        searchAble
      />
    </div>
  );
};

export default Inventory;
