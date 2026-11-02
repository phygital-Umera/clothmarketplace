import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {useGetUtensilCategories} from '@/lib/react-query/queriesAndMutations/admin/utensils';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import {useNavigate} from '@tanstack/react-router';
import {useEffect, useState} from 'react';
import {useDeleteUtensilCategory} from '@/lib/react-query/queriesAndMutations/admin/utensils'; // Import the hook
// import toast from 'react-hot-toast';

type UtensilsCategory = {
  id: string;
  CategoryName: string;
  Language: string;
};
type Language = {
  id: string; // or number, depending on your data structure
  name: string;
};
type Category = {
  id: string; // or number, depending on your data structure
  name: string;
  languageId: string; // or number
};

const columns: Column<UtensilsCategory>[] = [
  {header: 'Category Name', accessor: 'CategoryName', sortable: true},
  {header: 'Language', accessor: 'Language', sortable: true},
];

const DisplayUtensilCategory: React.FC = () => {
  const navigate = useNavigate();
  const [utensilsCategories, setUtensilsCategories] = useState<
    UtensilsCategory[]
  >([]);
  const {
    data: categoriesData,
    isError,
    isSuccess,
    error,
  } = useGetUtensilCategories();

  const {data: languagesData} = useGetLanguages();

  const {mutate: deleteUtensilCategory} = useDeleteUtensilCategory(); // Destructure the mutate function

  useEffect(() => {
    if (isSuccess && categoriesData.data && languagesData) {
      // Create a map to link language.id to language.name
      const languageMap = new Map<string, string>(
        languagesData.map((language: Language) => [language.id, language.name]),
      );

      // Map the API response to the format expected by the table
      const transformedData = categoriesData.data.map((category: Category) => ({
        id: category.id,
        CategoryName: category.name,
        Language: languageMap.get(category.languageId) || 'N/A', // Fallback to 'N/A' if language is missing
      }));

      setUtensilsCategories(transformedData);
    } else if (isError) {
      console.error(error);
    }
  }, [categoriesData, languagesData, isError, isSuccess, error]);

  const handleEdit = (items: UtensilsCategory) => {
    navigate({
      to: `/update/utensilCategory/${items.id}`,
    });
  };

  const handleDelete = (items: UtensilsCategory) => {
    // Call the delete function with the item's id
    deleteUtensilCategory(items.id, {
      onSuccess: () => {
        // Refresh the table after successful deletion
        setUtensilsCategories((prev) =>
          prev.filter((category) => category.id !== items.id),
        );
      },
    });
  };

  return (
    <>
      <GenericTable
        data={utensilsCategories}
        columns={columns}
        itemsPerPage={5}
        action
        onDelete={handleDelete} // Pass handleDelete to the table
        onEdit={handleEdit}
      />
    </>
  );
};

export default DisplayUtensilCategory;
