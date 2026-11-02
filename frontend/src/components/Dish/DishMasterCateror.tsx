import React, {useEffect, useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import {dishMasterSchemaCat} from '@/lib/validation/dishSchemas';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  useAddDish,
  useGetDishCategories,
  useGetDishes,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import SearchInputWithSuggestions from '../Forms/Input/GenericInputFieldList';
// import toast from 'react-hot-toast';
import AddRawMaterialToDishCateror from './AddRawMaterialToDishCateror';

interface Dish {
  name: string;
}

interface Option {
  value: string;
  label: string;
}
type FormValues = z.infer<typeof dishMasterSchemaCat>;

const DishMasterCateror: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(dishMasterSchemaCat),
  });
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [dishId, setdishId] = useState<string>('');
  const [page, setpage] = useState<number>(1);

  const [catagoryOptions, setcatagoryOptions] = useState<Option[]>([]);

  const {data: dishCategories} = useGetDishCategories();
  const {data: suggestions} = useGetDishes();
  const {
    mutate: addDish,
    isSuccess: addDishSuccess,
    data: addDishData,
  } = useAddDish();
  useEffect(() => {
    if (dishCategories?.data?.categories) {
      setcatagoryOptions(
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
  }, [suggestions, setDishes, dishCategories]);

  const onSubmit = (data: FormValues) => {
    addDish({
      name: data.name,
      priority: data.priority,
      categoryId: data.dishCategory,
      description: data.description,
    });
  };
  useEffect(() => {
    if (addDishSuccess) {
      // toast.success('Dish added successfully');
      setdishId(addDishData?.data?.id);
      methods.reset();
      setpage(2);
    }
  }, [addDishSuccess, addDishData, methods]);

  return (
    <>
      {page === 1 ? (
        <>
          <FormProvider {...methods}>
            <form
              onSubmit={methods.handleSubmit(onSubmit)}
              className="space-y-8 bg-white p-8 dark:bg-black"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
                <h1 className="col-span-12 mb-4 text-lg font-semibold">
                  Dish Master Cateror
                </h1>

                <div className="col-span-12 md:col-span-4">
                  <SearchInputWithSuggestions
                    name="name"
                    label="Dish Name"
                    placeholder="Search or type a dish name"
                    suggestions={dishes}
                  />
                </div>

                <div className="col-span-10 md:col-span-4">
                  <GenericSearchDropdown
                    name="priority"
                    label="Priority"
                    options={[
                      {label: '1', value: 'P1'},
                      {label: '2', value: 'P2'},
                      {label: '3', value: 'P3'},
                    ]}
                  />
                </div>

                <div className="col-span-12 md:col-span-4">
                  <GenericSearchDropdown
                    name="dishCategory"
                    label="Dish Category"
                    options={catagoryOptions}
                    defaultOption=""
                  />
                </div>

                <div className="col-span-12 md:col-span-full">
                  <GenericTextArea
                    rows={4}
                    name="description"
                    label="Dish Description"
                    placeholder="Enter dish description"
                  />
                </div>
              </div>
              {/* Form Buttons */}
              <div className="flex justify-end space-x-4">
                <GenericButton type="submit">Save</GenericButton>
              </div>
            </form>
            {/* <DisplayDishCat /> */}
          </FormProvider>
        </>
      ) : (
        <div>
          <AddRawMaterialToDishCateror id={dishId} />
        </div>
      )}
    </>
  );
};

export default DishMasterCateror;
