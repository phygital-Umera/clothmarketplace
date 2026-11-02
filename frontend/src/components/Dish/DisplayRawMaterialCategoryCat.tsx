import React from 'react';
import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';
import {
  useDeleteRawMaterialCategoryCat,
  useGetRawMaterialCategoriesCat,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
// import toast from 'react-hot-toast';

type RawMaterialName = {
  name: string;
  id: string;
};

const columns: Column<RawMaterialName>[] = [
  {header: 'Raw Material Category Name', accessor: 'name', sortable: true},
];

const DisplayRawMaterialCategoryCat: React.FC = () => {
  const navigate = useNavigate();
  const {mutateAsync: deleteRawMaterialCategory} =
    useDeleteRawMaterialCategoryCat();
  const {data: categories} = useGetRawMaterialCategoriesCat();
  console.log(categories);

  const handleEdit = (items: RawMaterialName) => {
    navigate({
      to: `/update/rawMaterialCategoryCateror/${items.id}`,
    });
  };

  const handleDelete = async (items: RawMaterialName) => {
    await deleteRawMaterialCategory(items.id);
  };

  return (
    <GenericTable
      data={categories?.data || []}
      columns={columns}
      itemsPerPage={5}
      action
      onDelete={handleDelete}
      onEdit={handleEdit}
      paginationOff
    />
  );
};

export default DisplayRawMaterialCategoryCat;
