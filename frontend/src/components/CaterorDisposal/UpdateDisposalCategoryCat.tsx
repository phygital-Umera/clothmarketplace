import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import {updatedisposalcategorySchema} from '@/lib/validation/disposalSchema';
import {useMatch, useNavigate} from '@tanstack/react-router';
import {
  useGetDisposalCategoryById,
  useUpdateDisposalCategory,
} from '@/lib/react-query/queriesAndMutations/cateror/disposal';
import toast from 'react-hot-toast'; // Import toast for notifications

type FormValues = z.infer<typeof updatedisposalcategorySchema>;

interface Props {
  id: string; // Predefined or fetched disposal category ID
}

const UpdateDisposalCategoryCat: React.FC<Props> = () => {
  const navigate = useNavigate();
  /* eslint-disable */
  const {params} = useMatch(
    '/_app/_edit/update/disposalcategoryCateror/$id' as any,
  );
  const {id = ''} = params as {id: string}; // Ensure the id is pulled from URL params correctly
  console.log(id);

  const methods = useForm<FormValues>({
    resolver: zodResolver(updatedisposalcategorySchema),
    defaultValues: {
      disposalCategoryName: '',
    },
  });

  const {reset, setValue, handleSubmit} = methods;

  // Fetch disposal category data by ID
  const {data: disposalCategory, isSuccess} = useGetDisposalCategoryById(id);
  console.log(disposalCategory);

  // Use the update disposal category mutation
  const {
    mutate: updateDisposalCategory,
    isPending,
    isSuccess: isUpdateSuccess,
    isError,
    error,
  } = useUpdateDisposalCategory();

  // Set form values when disposal category data is successfully fetched
  useEffect(() => {
    if (isSuccess && disposalCategory) {
      setValue('disposalCategoryName', disposalCategory.data.name || '');
    }
  }, [isSuccess, disposalCategory, setValue]);

  // Handle form submission
  const onSubmit = (data: FormValues) => {
    // Check if the name hasn't changed
    if (
      data.disposalCategoryName.trim() === disposalCategory?.data.name.trim()
    ) {
      toast.error('The name is already the same. Please enter a new name.'); // Show toast if no change
      return; // Prevent form submission
    }

    const updateData = {
      name: data.disposalCategoryName,
    };

    updateDisposalCategory({
      id, // The ID to identify which category to update
      data: updateData, // The update data object
    });
  };

  useEffect(() => {
    if (isUpdateSuccess) {
      reset();
      navigate({
        to: '/disposalcategory', // Redirect after update
      });
    } else if (isError) {
      const errorMessage =
        (error as {message?: string})?.message ||
        'Something went wrong while updating the disposal category'; // Get error message
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
            Update Disposal Category
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="disposalCategoryName"
              label="Disposal Category Name"
              placeholder="Enter Disposal Category Name"
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

export default UpdateDisposalCategoryCat;
