import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import GenericInputField from '../Forms/Input/GenericInputField';
import {updaterawmaterialcategorySchema} from '@/lib/validation/rawmaterialSchema';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  useGetRawMaterialCategoryByIdAdmin,
  useUpdateRawMaterialCategoryAdmin,
} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useMatch, useNavigate} from '@tanstack/react-router';
import GenericButton from '../Forms/Buttons/GenericButton';
// import toast from 'react-hot-toast';

type FormValues = z.infer<typeof updaterawmaterialcategorySchema>;

const UpdateRawMaterialCategory: React.FC = () => {
  const navigate = useNavigate();
  const {params} = useMatch(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    '/_app/_edit/update/rawMaterialCategory/$id' as any,
  );
  const {id = ''} = params as {id: string};

  const methods = useForm<FormValues>({
    resolver: zodResolver(updaterawmaterialcategorySchema),
    defaultValues: {name: ''},
  });
  const {reset} = methods;

  const {data: rawMaterialCategory, isSuccess} =
    useGetRawMaterialCategoryByIdAdmin(id);

  const {
    mutate: updateRawMaterialCategoryAdmin,
    isSuccess: isUpdateSuccess,
    isPending,
    isError,
    error,
  } = useUpdateRawMaterialCategoryAdmin();

  useEffect(() => {
    if (isSuccess && rawMaterialCategory?.data) {
      reset({
        name: rawMaterialCategory.data.name || '',
        languageId: rawMaterialCategory.data.languageId || '',
      });
    }
  }, [isSuccess, rawMaterialCategory, reset]);

  const onSubmit = (data: FormValues) => {
    // Check if the name hasn't changed

    console.log('Form submitted with data:', data); // Check if this logs
    updateRawMaterialCategoryAdmin(
      {
        id,
        data: {
          name: data.name,
          languageId: rawMaterialCategory?.data.languageId,
        },
      },
      {
        onSuccess: () => {
          reset();
          navigate({to: '/admin/dish/RawMaterialCategory'});
        },
      },
    );
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Update Raw Material Category
          </h1>
          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="name"
              label="Raw Material Category"
              placeholder="Enter Raw Material Category name"
            />
          </div>
          <div className="col-span-2 flex items-end md:col-span-2">
            <GenericButton type="submit">
              {isPending ? 'Updating' : 'Update'}
            </GenericButton>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default UpdateRawMaterialCategory;
