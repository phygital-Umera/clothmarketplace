import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import {updateutensilSchema} from '@/lib/validation/utensilSchema';
import {
  useGetUtensilById,
  useUpdateUtensil,
} from '@/lib/react-query/queriesAndMutations/admin/utensils';
import {useMatch, useNavigate} from '@tanstack/react-router';
import toast from 'react-hot-toast';

type FormValues = z.infer<typeof updateutensilSchema>;

interface Props {
  id: string; // ID to fetch and update the utensil
}

const UpdateUtensils: React.FC<Props> = () => {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const {params} = useMatch('/_app/_edit/update/utensils/$id' as any);
  const {id = ''} = params as {id: string};

  const methods = useForm<FormValues>({
    resolver: zodResolver(updateutensilSchema),
  });

  const {setValue, handleSubmit} = methods;

  // Fetch utensil data by ID
  const {data: utensil, isSuccess} = useGetUtensilById(id);

  // Use the update utensil mutation
  const {
    mutate: updateUtensil,
    isPending,
    isSuccess: isUpdateSuccess,
    isError,
    error,
  } = useUpdateUtensil();

  // Set form values when utensil data is successfully fetched
  useEffect(() => {
    if (isSuccess && utensil) {
      setValue('utensilName', utensil.name || '');
    }
  }, [isSuccess, utensil, setValue]);

  // Handle form submission
  const onSubmit = (data: FormValues) => {
    if (data.utensilName === utensil?.name) {
      // If the name hasn't changed, show a toast
      toast.error('No changes made. The name is the same.');
      return; // Prevent update if name is the same
    }

    const updateData = {
      name: data.utensilName,
      languageId: utensil?.languageId,
      categoryId: utensil?.categoryId,
    };

    // Perform the update
    updateUtensil(
      {
        id, // Make sure utensil?.id is not undefined
        updateData, // Include the updateData object here
      },
      {
        onSuccess: () =>
          navigate({
            to: `/admin/utensils/utensils`,
          }),
      },
    );
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Update Utensil
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="utensilName"
              label="Utensil Name"
              placeholder="Enter Utensil Name"
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

export default UpdateUtensils;
