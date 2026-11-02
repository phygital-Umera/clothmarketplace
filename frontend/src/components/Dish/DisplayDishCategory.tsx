import React, {useState, useEffect} from 'react';
import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import {useGetDishCategoriesAdmin} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useDeleteDishCategoryAdmin} from '@/lib/react-query/queriesAndMutations/admin/dish'; // Import the delete hook
// import toast from 'react-hot-toast';

interface Language {
  id: string;
  name: string;
}

type DishCategoryName = {
  id: string;
  name: string;
};

const columns: Column<DishCategoryName>[] = [
  {header: 'Dish Category Name', accessor: 'name', sortable: true},
];

const DisplayDishCategory: React.FC = () => {
  const navigate = useNavigate();
  const [languageId, setLanguageId] = useState<string>('');
  const [dishCategories, setDishCategories] = useState<DishCategoryName[]>([]);

  // Fetch languages data
  const {data: languagesData, isLoading: isLoadingLanguages} =
    useGetLanguages();

  // Fetch dish categories with the selected languageId
  const {
    data: dishCategoriesResponse,
    refetch: refetchDishCategories,
    isFetching: isFetchingDishCategories, // Track fetching state
  } = useGetDishCategoriesAdmin(languageId);

  // Update dish categories whenever the response changes
  useEffect(() => {
    if (dishCategoriesResponse?.data?.data) {
      setDishCategories(dishCategoriesResponse.data.data);
    }
  }, [dishCategoriesResponse]);

  // Trigger re-fetch when languageId changes
  useEffect(() => {
    if (languageId) {
      refetchDishCategories(); // Re-fetch the dish categories for the selected language
    }
  }, [languageId, refetchDishCategories]);

  // Handle language selection change
  const handleLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const selectedLanguageId = event.target.value;
    setLanguageId(selectedLanguageId);
  };

  // Handle edit action
  const handleEdit = (item: DishCategoryName) => {
    navigate({
      to: `/update/dishCategory/${item.id}`,
    });
  };

  // Handle delete action
  const {mutate: deleteDishCategory} = useDeleteDishCategoryAdmin();

  const handleDelete = (item: DishCategoryName) => {
    const {id} = item; // Get the id from the DishCategoryName item
    deleteDishCategory(id, {
      onSuccess: () => {
        refetchDishCategories(); // Refresh categories after successful delete
      },
      onError: (error) => {
        console.error('Error deleting dish category:', error);
      },
    });
  };

  return (
    <div>
      {/* Language Dropdown */}
      <label
        htmlFor="language-select"
        className="mb-2.5 block text-black dark:text-white"
      >
        Select Language
      </label>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
        <div className="col-span-12 mb-8 md:col-span-6">
          {isLoadingLanguages ? (
            <div>Loading languages...</div>
          ) : languagesData?.length > 0 ? (
            <select
              id="language-select"
              value={languageId}
              onChange={handleLanguageChange}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent px-4 py-3 outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
            >
              <option value="">Select Language</option>
              {languagesData.map((language: Language) => (
                <option key={language.id} value={language.id}>
                  {language.name}
                </option>
              ))}
            </select>
          ) : (
            <div>No languages available</div>
          )}
        </div>
      </div>

      {/* Table displaying dish categories */}
      {dishCategories ? (
        <GenericTable
          data={dishCategories || []} // Pass the updated dish categories to the table
          columns={columns}
          itemsPerPage={5}
          action
          searchAble
          onDelete={handleDelete} // Handle delete
          onEdit={handleEdit}
        />
      ) : (
        <div>No dish categories available</div>
      )}
    </div>
  );
};

export default DisplayDishCategory;
