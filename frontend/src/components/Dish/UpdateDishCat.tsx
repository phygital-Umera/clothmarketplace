import React, {useEffect, useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import {dishMasterSchemaCat} from '@/lib/validation/dishSchemas';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useMatch, useNavigate} from '@tanstack/react-router';
import {
  useGetDishById,
  useGetDishCategories,
  useUpdateDish,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';

// import toast from 'react-hot-toast';

type FormValues = z.infer<typeof dishMasterSchemaCat>;

interface Option {
  value: string;
  label: string;
}

const UpdateDishCat: React.FC = () => {
  const navigate = useNavigate();
  const methods = useForm<FormValues>({
    resolver: zodResolver(dishMasterSchemaCat),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const {params} = useMatch('/_app/_edit/update/$name/$id' as any);
  const {id = ''} = params as {id: string};
  const {
    data: dishCategories,
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useGetDishCategories();
  const {
    data: dishData,
    isLoading: isLoadingDish,
    error: dishDataError,
  } = useGetDishById(id);
  const {
    mutate: updateDish,
    isSuccess,
    isError,
    error: updateDishError,
  } = useUpdateDish();
  const {reset} = methods;

  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);

  // Handling category options
  useEffect(() => {
    if (dishCategories?.data?.categories) {
      console.log('Categories:', dishCategories.data.categories); // Debugging log
      setCategoryOptions(
        dishCategories?.data?.categories.map(
          (category: {id: string; name: string}) => ({
            value: category.id,
            label: category.name,
          }),
        ),
      );
    }
  }, [dishCategories]);

  // Reset the form with fetched dish data
  useEffect(() => {
    if (dishData) {
      console.log('Dish Data:', dishData.data); // Debugging log
      reset({
        name: dishData.data.name,
        priority: dishData.data.priority,
        dishCategory: dishData.data.categoryId, // Ensure this is correct
        description: dishData.data.description,
      });
    }
  }, [dishData, reset]);

  const onSubmit = (data: FormValues) => {
    console.log('Form Data:', data); // Debugging log

    // Ensure categoryId is correctly passed to the mutation
    updateDish({
      id: id, // id should be a string
      data: {
        name: data.name,
        priority: data.priority,
        categoryId: data.dishCategory, // Ensure categoryId is correct
        description: data.description || ' ', // Providing default value if empty
      },
    });
  };

  // Show toast and navigate after a successful mutation
  useEffect(() => {
    if (isSuccess) {
      // toast.error('Dish updated successfully');
      navigate({to: '/AddDish'}); // Navigate after success
      reset(); // Optionally reset the form after submission
    }
  }, [isSuccess, navigate, reset]);

  // Handle error from the update mutation
  useEffect(() => {
    if (isError && updateDishError) {
      // toast.error(`Failed to update dish: ${updateDishError.message}`);
    }
  }, [isError, updateDishError]);

  // Loading and error states
  if (isLoadingCategories || isLoadingDish) {
    return <div>Loading...</div>;
  }

  if (categoriesError || dishDataError) {
    return <div>Error loading data</div>;
  }

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Dish Master
          </h1>

          <div className="col-span-12 md:col-span-4">
            <GenericInputField
              name="name"
              label="Dish Name"
              placeholder="Enter dish name"
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
              options={categoryOptions}
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
    </FormProvider>
  );
};

export default UpdateDishCat;
