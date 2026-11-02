import React, {useEffect} from 'react';
// import toast from 'react-hot-toast';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import {updateutensilSchema} from '@/lib/validation/utensilSchema';
import {
  useGetUtensilById,
  useUpdateUtensil,
} from '@/lib/react-query/queriesAndMutations/cateror/utensils';
import {useMatch, useNavigate} from '@tanstack/react-router';

type FormValues = z.infer<typeof updateutensilSchema>;

const UpdateUtensilsCat: React.FC = () => {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const {params} = useMatch('/_app/_edit/update/utensilsCateror/$id' as any);
  const {id = ''} = params as {id: string};

  const methods = useForm<FormValues>({
    resolver: zodResolver(updateutensilSchema),
  });

  const {reset, setValue, handleSubmit} = methods;

  // Fetch utensil data by ID
  const {data: utensil, isSuccess} = useGetUtensilById(id);
  console.log('utensil', utensil);

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
    // console.log(' Form submitted', data);

    if (data.utensilName.trim() === utensil?.name.trim()) {
      return; // Prevent form submission if the name hasn't changed
    }
    const updateData = {
      name: data.utensilName,
      id,
      languageId: utensil?.languageId,
      categoryId: utensil?.categoryId, // Now guaranteed to be defined
    };

    updateUtensil({
      id,
      data: {
        categoryId: utensil?.categoryId,
        name: data.utensilName,
      },
    });
  };

  // Use effect for update result
  useEffect(() => {
    if (isUpdateSuccess) {
      reset();
      navigate({
        to: `/utensils`,
      });
    } else if (isError) {
      const errorMessage =
        (error as {message?: string})?.message ||
        'Something went wrong while updating the utensil';
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

export default UpdateUtensilsCat;
