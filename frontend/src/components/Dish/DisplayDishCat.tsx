/* eslint-disable */

import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import Dish from '@/components/Dish/Dish';
import {useNavigate} from '@tanstack/react-router';
import {
  useDeleteDish,
  useGetDishes,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {useEffect, useMemo, useState} from 'react';
import toast from 'react-hot-toast';
import {FormProvider, useForm} from 'react-hook-form';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';

type Dish = {
  id: string;
  name: string;
  category: string;
  hasNoRawMaterials?: boolean;
};

const columns: Column<Dish>[] = [
  {
    header: 'Dish Name',
    accessor: 'name',
    sortable: true,
    render: (row) => (
      <span
        style={{
          color: row.hasNoRawMaterials ? 'red' : 'inherit',
          fontWeight: 'bold',
        }}
      >
        {row.name}
      </span>
    ),
  },
  {header: 'Category', accessor: 'category', sortable: true},
];

const DisplayDishCat: React.FC = () => {
  const navigate = useNavigate();
  const {data: DishNames} = useGetDishes();
  console.log('Dish Names', DishNames);

  const {mutate: deleteDish} = useDeleteDish();

  const methods = useForm<{category: string; rawMaterialFilter: string}>({
    defaultValues: {rawMaterialFilter: 'all'},
  });
  const selectedCategoryId = methods.watch('category');
  const rawMaterialFilter = methods.watch('rawMaterialFilter');

  const [dishes, setDishes] = useState<Dish[]>([]);

  useEffect(() => {
    if (DishNames?.data?.dishes) {
      const mappedDishes = DishNames.data.dishes.map((dish: any) => ({
        id: dish.id,
        name: dish.name,
        category: dish.category?.name,
        categoryId: dish.category?.id,
        hasNoRawMaterials: dish?.caterorDishRawMaterialQuantities?.length === 0,
      }));

      const filteredByCategory =
        selectedCategoryId && selectedCategoryId !== ''
          ? mappedDishes.filter(
              (dish) => dish.categoryId === selectedCategoryId,
            )
          : mappedDishes;

      const finalFiltered = filteredByCategory.filter((dish) => {
        if (rawMaterialFilter === 'withZero') return dish.hasNoRawMaterials;
        if (rawMaterialFilter === 'withoutZero') return !dish.hasNoRawMaterials;
        return true; // 'all'
      });

      setDishes(finalFiltered);
    }
  }, [DishNames, selectedCategoryId, rawMaterialFilter]);

  const categoryOptions = useMemo(() => {
    const unique: {[key: string]: string} = {};
    DishNames?.data?.dishes.forEach((dish: any) => {
      if (dish.category?.id && dish.category?.name) {
        unique[dish.category.id] = dish.category.name;
      }
    });
    return Object.entries(unique).map(([id, name]) => ({
      value: id,
      label: name,
    }));
  }, [DishNames]);

  const rawMaterialOptions = [
    {value: 'all', label: 'All'},
    {value: 'withZero', label: 'Dishes with No Raw Materials'},
    {value: 'withoutZero', label: 'Dishes with Raw Materials'},
  ];

  const handleEdit = async (items: Dish) => {
    await sessionStorage.setItem('dishEdit', items.name);
    await navigate({to: `/AddDish`});
  };

  const handleDelete = (items: Dish) => {
    deleteDish(items.id, {
      onSuccess: () => toast.success('Dish deleted successfully'),
      onError: () => toast.error('This Dish Already Used In Some Events'),
    });
  };

  return (
    <FormProvider {...methods}>
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <GenericSearchDropdown
          name="category"
          label="Filter by Category"
          options={categoryOptions}
        />
        <GenericSearchDropdown
          name="rawMaterialFilter"
          label="Raw Material Filter"
          options={rawMaterialOptions}
        />
      </div>
      <GenericTable
        title="All Dishes"
        data={dishes || []}
        columns={columns}
        itemsPerPage={20}
        action
        searchAble
        onEdit={handleEdit}
        onDelete={handleDelete}
        paginationOff
      />
    </FormProvider>
  );
};

export default DisplayDishCat;
