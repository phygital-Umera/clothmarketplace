/* eslint-disable */
import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import toast from 'react-hot-toast'; // Import toast library
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import {updateutensilcategorySchema} from '@/lib/validation/utensilSchema';
import {
  useGetUtensilCategoryById,
  useUpdateUtensilCategory,
} from '@/lib/react-query/queriesAndMutations/cateror/utensils';
import {useMatch, useNavigate} from '@tanstack/react-router';

type FormValues = z.infer<typeof updateutensilcategorySchema>;

const UpdateUtensilCategoryCat: React.FC = () => {
  const navigate = useNavigate();

  const {params} = useMatch(
    '/_app/_edit/update/utensilcategoryCateror/$id' as any,
  );
  const {id = ''} = params as {id: string}; // Ensure the id is pulled from URL params correctly
  console.log(id);

  const methods = useForm<FormValues>({
    resolver: zodResolver(updateutensilcategorySchema),
    defaultValues: {
      utensilCategoryName: '',
    },
  });

  const {reset, handleSubmit} = methods;

  // Fetch utensil data by ID
  const {data: utensil, isSuccess} = useGetUtensilCategoryById(id);
  console.log('any', utensil, isSuccess);

  // Use the update utensil category mutation
  const {
    mutate: updateUtensilCategory,
    isPending,
    isSuccess: isUpdateSuccess,
    isError,
    error,
  } = useUpdateUtensilCategory();

  // Set form values when utensil data is successfully fetched
  useEffect(() => {
    if (isSuccess && utensil) {
      reset({utensilCategoryName: utensil.name || ''});
    }
  }, [isSuccess, utensil, reset]);

  // Handle form submission
  const onSubmit = (data: FormValues) => {
    // Prevent updating if the name hasn't changed
    if (data.utensilCategoryName.trim() === utensil?.name.trim()) {
      toast.error('The name is already the same. Please enter a new name.');
      return;
    }

    const updateData = {
      name: data.utensilCategoryName,
      id,
      languageId: utensil?.languageId,
    };

    updateUtensilCategory({
      id, // The ID to identify which category to update
      data: updateData, // The update data object
    });
    console.log('data', data);
  };

  useEffect(() => {
    if (isUpdateSuccess) {
      reset();
      navigate({
        to: '/utensilCategory', // Redirect after update
      });
    }
  }, [isUpdateSuccess, isError, error, reset, navigate]);

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Update Utensil Category
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="utensilCategoryName"
              label="Utensil Category Name"
              placeholder="Enter Utensil Category"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">
            {isPending ? 'Updating...' : 'Update'}
          </GenericButton>
          {/* <GenericResetButton type="reset">Reset</GenericResetButton> */}
        </div>
      </form>
    </FormProvider>
  );
};

export default UpdateUtensilCategoryCat;
