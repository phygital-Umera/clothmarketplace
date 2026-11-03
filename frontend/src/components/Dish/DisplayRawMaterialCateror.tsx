import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {
  useDeleteRawMaterial,
  useGetRawMaterialCategoriesCat,
  useGetRawMaterialsCateror,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {useNavigate} from '@tanstack/react-router';
// import toast from 'react-hot-toast';

type RawMaterial = {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  unit: string;
  amount: number;
};

const columns: Column<RawMaterial>[] = [
  {header: 'Raw Material Name', accessor: 'name', sortable: true},
  {header: 'Raw Material Category', accessor: 'category', sortable: true},
  {header: 'Unit', accessor: 'unit', sortable: false},
  {header: 'Amount', accessor: 'amount', sortable: false},
];

const DisplayRawMaterialCateror: React.FC = () => {
  const navigate = useNavigate();
  const {data: rawMaterial} = useGetRawMaterialsCateror();

  const {data: rawMaterialCategory} = useGetRawMaterialCategoriesCat();
  console.log('rawMaterial', rawMaterialCategory);
  const rawMaterials =
    (Array.isArray(rawMaterial?.data.rawMaterials) &&
      rawMaterial?.data.rawMaterials.map(
        (item: {
          id: string;
          name: string;
          categoryId: string;
          unit: string;
        }) => ({
          id: item.id,
          name: item.name,
          category: item.category.name, // Map category.name
          unit: item.unit,
          amount: item.amount,
        }),
      )) ||
    [];

  const {mutateAsync: deleteRawMaterial} = useDeleteRawMaterial();

  const handleEdit = (items: RawMaterial) => {
    navigate({
      to: `/update/rawMaterialCateror/${items.id}`,
    });
  };

  const handleDelete = async (items: RawMaterial) => {
    try {
      await deleteRawMaterial(items.id);
      // toast.success('Deleted successfully');
    } catch (error) {
      // toast.error('Error while deleting');
    }
  };
  return (
    <GenericTable
      data={rawMaterials || []}
      columns={columns}
      itemsPerPage={10}
      action
      title="Raw Materials"
      searchAble
      onDelete={handleDelete}
      onEdit={handleEdit}
      paginationOff
    />
  );
};

export default DisplayRawMaterialCateror;
