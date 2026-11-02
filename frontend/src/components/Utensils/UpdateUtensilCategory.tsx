import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import {updateutensilcategorySchema} from '@/lib/validation/utensilSchema';
import {
  useGetUtensilCategoryById,
  useUpdateUtensilCategory,
} from '@/lib/react-query/queriesAndMutations/admin/utensils';
import {useMatch, useNavigate} from '@tanstack/react-router';
import toast from 'react-hot-toast';

type FormValues = z.infer<typeof updateutensilcategorySchema>;

const UpdateUtensilCategory: React.FC = () => {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const {params} = useMatch('/_app/_edit/update/utensilCategory/$id' as any);
  const {id = ''} = params as {id: string};
  const methods = useForm<FormValues>({
    resolver: zodResolver(updateutensilcategorySchema),
    defaultValues: {
      utensilCategoryName: '',
    },
  });

  const {setValue, handleSubmit} = methods;

  // Fetch utensil data by ID
  const {data: utensil, isSuccess} = useGetUtensilCategoryById(id);

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
      setValue('utensilCategoryName', utensil.name || '');
    }
  }, [isSuccess, utensil, setValue]);

  // Handle form submission
  const onSubmit = (data: FormValues) => {
    if (data.utensilCategoryName === utensil?.name) {
      toast.error('No changes made. The name is the same.');
      return; // Prevent update if name is the same
    }

    const updateData = {
      name: data.utensilCategoryName,
      id: utensil?.id,
      languageId: utensil?.languageId, // Ensuring languageId is passed
    };

    updateUtensilCategory({id, updateData}); // Correct mutation call

    // toast.success('Utensil category updated successfully!');
    navigate({
      to: '/admin/utensils/utensilCategory', // Updated to use id for editing
    });
  };

  useEffect(() => {
    if (isUpdateSuccess) {
      // console.log('Utensil category updated successfully');
    } else if (isError) {
      console.error(error);
      // toast.error('Something went wrong while updating the utensil category');
    }
  }, [isUpdateSuccess, isError, error]);

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
        </div>
      </form>
    </FormProvider>
  );
};

export default UpdateUtensilCategory;
