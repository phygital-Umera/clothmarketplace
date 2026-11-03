import React, {useEffect, useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {dishMasterSchemaCat} from '@/lib/validation/dishSchemas';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  useAddDish,
  useGetDishById,
  useGetDishCategories,
  useGetDishes,
  useUpdateDish,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import GenericSearchDropdown from '@/components/Forms/SearchDropDown/GenericSearchDropdown';
import GenericTextArea from '@/components/Forms/TextArea/GenericTextArea';
import GenericButton from '@/components/Forms/Buttons/GenericButton';
import SearchInputWithSuggestions from '@/components/Forms/Input/GenericInputFieldList';
import NewRawMaterial from './NewRawMaterial';
import toast from 'react-hot-toast';

interface Dish {
  id: string;
  name: string;
}

interface Option {
  value: string;
  label: string;
}
type FormValues = z.infer<typeof dishMasterSchemaCat>;

const NewDishMaster: React.FC = () => {
  const dishEdit = sessionStorage.getItem('dishEdit');
  const methods = useForm<FormValues>({
    resolver: zodResolver(dishMasterSchemaCat),
    defaultValues: {},
  });

  useEffect(() => {
    if (dishEdit) {
      sessionStorage.removeItem('dishEdit');
    }
  }, [dishEdit, methods]);

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [dishId, setDishId] = useState<string>('');

  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);

  const {data: dishCategories} = useGetDishCategories();
  const {data: suggestions} = useGetDishes();
  const {data: dishData, refetch: dishDataRefetch} = useGetDishById(dishId);

  const {
    mutate: addDish,
    isSuccess: addDishSuccess,
    isError: isUpdateError,
    data: addDishData,
    isPending,
  } = useAddDish();

  const {
    mutate: updateDish,
    isSuccess: updateDishSuccess,
    isError: isUpdateError2,
    data: updateDishData,
    isPending: isUpdatePending,
  } = useUpdateDish();

  useEffect(() => {
    if (dishCategories?.data?.categories) {
      setCategoryOptions(
        dishCategories?.data?.categories.map(
          (category: {id: string; name: string}) => ({
            value: category.id,
            label: category.name,
          }),
        ),
      );
    }

    if (suggestions?.data?.dishes) {
      setDishes(suggestions.data.dishes);
    }
  }, [suggestions, dishCategories]);

  const onDishSearch = (selectedDishId: string) => {
    setDishId(selectedDishId);
    dishDataRefetch(); // Trigger refetch when dish is selected
  };

  const onSubmit = (data: FormValues) => {
    const payload = {
      name: data.name,
      categoryId: data.dishCategory,
      priority: 'P1',
      // description: data.description,
    };

    if (dishId) {
      updateDish({
        id: dishId,
        data: payload,
      });
    } else {
      addDish(payload);
    }
  };

  useEffect(() => {
    if (addDishSuccess) {
      toast.success('Dish added successfully');
      setDishId(addDishData?.data?.id);
      methods.reset();
    }
    if (isUpdateError) {
      toast.error('Dish name already exists..');
    }
  }, [addDishSuccess, isUpdateError, addDishData, methods]);

  useEffect(() => {
    if (updateDishSuccess) {
      toast.success('Dish updated successfully');
      setDishId(updateDishData?.data?.id);
      methods.reset();
    }
    if (isUpdateError2) {
      toast.error('Dish name already exists..');
    }
  }, [updateDishSuccess, isUpdateError2, updateDishData, methods]);

  useEffect(() => {
    if (dishData?.data) {
      const dish = dishData.data;
      methods.reset({
        name: dish.name,
        // description: dish.description || '',
        dishCategory: dish.categoryId || '',
      });
    }
  }, [dishData, methods]);

  return (
    <>
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(onSubmit)}
          className="space-y-8 bg-white p-8 dark:bg-black"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
            <h1 className="col-span-12 mb-4 text-lg font-semibold">
              New Dish Master Cateror
            </h1>

            <div className="col-span-12 md:col-span-6">
              <SearchInputWithSuggestions
                name="name"
                label="Dish Name"
                placeholder="Search or type a dish name"
                suggestions={dishes}
                onDishSearch={onDishSearch}
                defaultValue={dishEdit ? dishEdit : ''}
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <GenericSearchDropdown
                name="dishCategory"
                label="Dish Category"
                options={categoryOptions}
                defaultOption=""
              />
            </div>
          </div>
          {/* Form Buttons */}
          <div className="flex justify-end space-x-4">
            <GenericButton type="submit">
              {isPending ? 'Saving...' : 'Save'}
            </GenericButton>
          </div>
        </form>
        <NewRawMaterial dishId={dishId} />
      </FormProvider>
    </>
  );
};

export default NewDishMaster;
