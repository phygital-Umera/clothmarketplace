import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import GenericInputField from '../Forms/Input/GenericInputField';
import {rawmaterialcategoryCaterorSchema} from '@/lib/validation/rawmaterialSchema';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useMatch, useNavigate} from '@tanstack/react-router';
import GenericButton from '../Forms/Buttons/GenericButton';
import {
  useGetRawMaterialCategoryByIdCat,
  useUpdateRawMaterialCategoriesCat,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
// import toast from 'react-hot-toast';
// import {updateRawMaterialCaterorCat} from '@/lib/api/cateror/dish';

type FormValues = z.infer<typeof rawmaterialcategoryCaterorSchema>;

interface Props {
  id: string;
}

const UpdateRawMaterialCategory: React.FC<Props> = () => {
  const navigate = useNavigate();
  /* eslint-disable */
  const {params} = useMatch(
    '/_app/_edit/update/rawMaterialCategoryCateror/$id' as any,
  );
  const {id = ''} = params as {id: string};

  const methods = useForm<FormValues>({
    resolver: zodResolver(rawmaterialcategoryCaterorSchema),
    defaultValues: {name: ''},
  });
  const {reset, setValue} = methods;

  const {data: rawMaterialCategory, isSuccess} =
    useGetRawMaterialCategoryByIdCat(id);
  console.log(' rawMaterialCategory ', rawMaterialCategory);

  const {
    mutate: updateRawMaterialCategory,
    isSuccess: isUpdateSuccess,
    isPending: isUpdating,
    isError,
    error,
  } = useUpdateRawMaterialCategoriesCat();

  useEffect(() => {
    if (isSuccess && rawMaterialCategory?.data) {
      setValue('name', rawMaterialCategory.data.name || '');
    }
  }, [isSuccess, rawMaterialCategory, setValue]);

  useEffect(() => {
    if (isUpdateSuccess) {
      reset();
      navigate({to: '/RawMaterialCategory'});
    } else if (isError) {
      const errorMessage =
        (error as any)?.data?.message ||
        'Failed to update Raw Material Category';
      console.error(error);
    }
  }, [isUpdateSuccess, isError, error, reset, navigate]);

  const onSubmit = (data: FormValues) => {
    console.log('data', data);
    updateRawMaterialCategory({
      id: id,
      data: {
        name: data.name,
      },
    });
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
              {isUpdating ? 'Updating...' : 'Update'}
            </GenericButton>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default UpdateRawMaterialCategory;
