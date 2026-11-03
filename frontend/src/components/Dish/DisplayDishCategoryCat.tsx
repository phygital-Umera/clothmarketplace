import React, {useEffect} from 'react';
import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';
// import {toast} from 'react-hot-toast';
import {
  useDeleteDishCategory,
  useGetDishCategories,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';

type DishCategoryName = {
  id: string;
  name: string;
};

const columns: Column<DishCategoryName>[] = [
  {header: 'Dish Category Name', accessor: 'name', sortable: true},
];

const DisplayDishCategoryCat: React.FC = () => {
  const navigate = useNavigate();
  const {
    data: dishCategoriesResponse,
    isLoading: isLoadingDishCategories,
    refetch,
  } = useGetDishCategories();
  // useEffect(() => {
  //   if (isSuccess && dishCategoriesResponse?.data) {
  //     const rawData = dishCategoriesResponse.data;

  //     // Transform response if needed
  //     const transformedResponse = rawData.categories
  //       ? {data: rawData.categories}
  //       : {data: []}; // Fallback to an empty array

  //     // Log for debugging
  //     console.log('Transformed Response:', transformedResponse);

  //     // Validate the array structure before mapping
  //     if (Array.isArray(transformedResponse.data)) {
  //       const transformedData = transformedResponse.data.map(
  //         (category: Category) => ({
  //           id: category.id,
  //           name: category.name,
  //         }),
  //       );
  //       setDishCategories(transformedData);
  //     } else {
  //       console.error('Expected an array but got:', transformedResponse?.data);
  //       setDishCategories([]); // Default to an empty array
  //     }
  //   }
  // }, [isSuccess, dishCategoriesResponse]);

  useEffect(() => {
    refetch(); // Refetch data when the component mounts
  }, [location, refetch]); // Trigger refetch when the route changes

  const handleEdit = (item: DishCategoryName) => {
    navigate({to: `/update/dishCategoryCateror/${item.id}`});
  };

  const {mutate: deleteDishCategory} = useDeleteDishCategory();

  const handleDelete = (item: DishCategoryName) => {
    deleteDishCategory(item.id, {
      onSuccess: () => {},
      onError: (err) => {
        console.error(err);
      },
    });
  };
  return (
    <>
      {isLoadingDishCategories && <p>Loading...</p>}
      {dishCategoriesResponse?.data.categories == 0 && (
        <p>No categories found.</p>
      )}
      <GenericTable
        data={dishCategoriesResponse?.data.categories || []}
        columns={columns}
        action
        onDelete={handleDelete}
        onEdit={handleEdit}
        paginationOff
      />
    </>
  );
};

export default DisplayDishCategoryCat;
