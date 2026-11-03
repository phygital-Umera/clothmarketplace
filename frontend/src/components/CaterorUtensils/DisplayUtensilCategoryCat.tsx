import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {useGetUtensilCategories} from '@/lib/react-query/queriesAndMutations/cateror/utensils';
import {useNavigate} from '@tanstack/react-router';
import {useState, useEffect} from 'react';
import {useDeleteUtensilCategory} from '@/lib/react-query/queriesAndMutations/cateror/utensils';

type UtensilsCategory = {
  id: string;
  CategoryName: string;
};

type ApiCategory = {
  id: string;
  name: string; // Assuming this is the name of the category
};

const columns: Column<UtensilsCategory>[] = [
  {header: 'Category Name', accessor: 'CategoryName', sortable: true},
];

const DisplayUtensilCategoryCat: React.FC = () => {
  const navigate = useNavigate();
  const [utensilsCategories, setUtensilsCategories] = useState<
    UtensilsCategory[]
  >([]);

  // Fetch utensil categories using the custom hook
  const {data, isError, isSuccess, error} = useGetUtensilCategories();
  console.log('data', data);

  // Delete utensil category mutation
  const {mutate: deleteUtensilCategory} = useDeleteUtensilCategory();

  // Update state when data is successfully fetched
  useEffect(() => {
    if (isSuccess && data && Array.isArray(data.data)) {
      // Map the data to match the expected format
      const formattedCategories = data?.data.map((category: ApiCategory) => ({
        id: category.id,
        CategoryName: category.name, // Assuming 'name' is the category name
      }));
      setUtensilsCategories(formattedCategories);
    }
  }, [data, isSuccess]);

  // Edit handler
  const handleEdit = (items: UtensilsCategory) => {
    navigate({
      to: `/update/utensilCategoryCateror/${items.id}`,
    });
  };

  const handleDelete = (items: UtensilsCategory) => {
    deleteUtensilCategory(items.id, {
      onSuccess: () => {
        setUtensilsCategories((prev) =>
          prev.filter((category) => category.id !== items.id),
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        const errorMessage =
          err?.response?.data?.message ||
          'This item is linked to other records and cannot be deleted.';
      },
    });
  };

  if (isError) {
    return <div>Error: {error?.message || 'Something went wrong'}</div>;
  }

  return (
    <GenericTable
      data={utensilsCategories}
      columns={columns}
      itemsPerPage={5}
      action
      onDelete={handleDelete}
      onEdit={handleEdit}
    />
  );
};

export default DisplayUtensilCategoryCat;
