import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {useGetDisposalCategories} from '@/lib/react-query/queriesAndMutations/cateror/disposal';
import {useNavigate} from '@tanstack/react-router';
import {useEffect, useState} from 'react';
import {useDeleteDisposalCategory} from '@/lib/react-query/queriesAndMutations/cateror/disposal';
// import toast from 'react-hot-toast'; // Import toast for notifications

type DisposalCategory = {
  id: string;
  CategoryName: string;
};

type Category = {
  id: string; // or number, depending on your data structure
  name: string; // or number
};

const columns: Column<DisposalCategory>[] = [
  {header: 'Disposal Category', accessor: 'CategoryName', sortable: true},
];

const DisplayDisposalCategoryCat: React.FC = () => {
  const navigate = useNavigate();
  const [disposalCategories, setDisposalCategories] = useState<
    DisposalCategory[]
  >([]);

  // Fetch disposal categories
  const {
    data: categoriesData,
    isError,
    isSuccess,
    error,
  } = useGetDisposalCategories();
  const {mutate: deleteDisposalCategory} = useDeleteDisposalCategory();

  useEffect(() => {
    if (isSuccess && categoriesData.data) {
      // Safely access nested categories
      const transformedData = categoriesData.data?.data?.map(
        (category: Category) => ({
          id: category.id,
          CategoryName: category.name,
        }),
      );
      setDisposalCategories(transformedData);
    }
  }, [isSuccess, categoriesData]);

  const handleEdit = (item: DisposalCategory) => {
    navigate({
      to: `/update/disposalcategoryCateror/${item.id}`,
    });
  };

  const handleDelete = async (item: DisposalCategory) => {
    try {
      const hasRelatedRecords = await checkForRelatedRecords(item.id);
      if (hasRelatedRecords) {
        alert('Cannot delete this category because it has related records.');
        return;
      }

      deleteDisposalCategory(item.id, {
        onSuccess: () => {
          // Update the state to remove the deleted category from the UI
          setDisposalCategories((prev) =>
            prev.filter((category) => category.id !== item.id),
          );
        },
      });
    } catch (error) {
      console.error('Error deleting disposal category:', error);
    }
  };

  // Function to check for related records
  const checkForRelatedRecords = async (categoryId: string) => {
    try {
      const response = await fetch(
        `/api/v1/admin/disposals?categoryId=${categoryId}`,
      );
      const data = await response.json();
      return data.length > 0; // Assuming the response returns an array of related records
    } catch (error) {
      console.error('Error checking for related records:', error);
      return false; // Default to false if there's an error
    }
  };

  if (isError) {
    return <div>Error loading disposal categories: {error?.message}</div>;
  }

  return (
    <GenericTable
      data={disposalCategories}
      columns={columns}
      itemsPerPage={5}
      action
      onDelete={handleDelete}
      onEdit={handleEdit}
    />
  );
};

export default DisplayDisposalCategoryCat;
