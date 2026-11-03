import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {useMatch, useNavigate} from '@tanstack/react-router';
import z from 'zod';
import {
  useGetDishCategoryById,
  useUpdateDishCategory,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {dishCategoryValidationSchema} from '@/lib/validation/dishSchemas';
// import toast from 'react-hot-toast';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';

interface Props {}

type FormValues = z.infer<typeof dishCategoryValidationSchema>;

const UpdateDishCategoryCateror: React.FC<Props> = () => {
  const navigate = useNavigate();
  const {params} = useMatch(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    '/_app/_edit/update/dishCategoryCateror/$id' as any, // Replace with route definition
  );
  const {id = ''} = params as {id: string};

  const methods = useForm<FormValues>({
    resolver: zodResolver(dishCategoryValidationSchema),
    defaultValues: {
      name: '',
    },
  });

  const {reset, handleSubmit} = methods;

  // Fetch dish category by ID
  const {
    data: dishCategory,
    isSuccess: isCategoryFetched,
    isLoading: isLoadingCategory,
  } = useGetDishCategoryById(id);

  // Mutation for updating the dish category
  const {
    mutate: updateDishCategory,
    isPending: isUpdating,
    isError,
    error,
  } = useUpdateDishCategory();

  // Set form values when the dish category is fetched
  useEffect(() => {
    if (isCategoryFetched && dishCategory) {
      reset({
        name: dishCategory.data.name || '',
      });
    }
  }, [isCategoryFetched, dishCategory, reset]);

  const onSubmit = (data: FormValues) => {
    updateDishCategory(
      {
        id,
        data,
      },
      {
        onSuccess: () => {
          navigate({to: '/dishCategory'}); // Redirect after update
        },
        onError: (err) => {
          console.error('Error updating dish category:', err);
        },
      },
    );
  };

  useEffect(() => {
    if (!isLoadingCategory && !dishCategory) {
      console.warn('Dish category not found, redirecting...');
      navigate({to: '/dishCategory'});
    }
  }, [isLoadingCategory, dishCategory, navigate]);

  return (
    <div className="space-y-8 bg-white p-8 dark:bg-black">
      {isLoadingCategory && <p>Loading dish category...</p>}
      {!isLoadingCategory && dishCategory && (
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <h1 className="text-lg font-semibold">Update Dish Category</h1>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
              <div className="col-span-12 md:col-span-6">
                <GenericInputField
                  name="name"
                  label="Dish Category Name"
                  placeholder="Enter dish category name"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <GenericButton type="submit" disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update'}
              </GenericButton>
            </div>

            {isError && <p className="text-red-500">Error: {error?.message}</p>}
          </form>
        </FormProvider>
      )}
    </div>
  );
};

export default UpdateDishCategoryCateror;
