import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import GenericInputField from '../Forms/Input/GenericInputField';
import {rawmaterialcategoryCaterorSchema} from '@/lib/validation/rawmaterialSchema';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import GenericButton from '../Forms/Buttons/GenericButton';
import {useAddRawMaterialCategory} from '@/lib/react-query/queriesAndMutations/cateror/dish';
// import toast from 'react-hot-toast';

type FormValues = z.infer<typeof rawmaterialcategoryCaterorSchema>;

const RawMaterialCategoryCateror: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(rawmaterialcategoryCaterorSchema),
  });

  const {reset} = methods;

  const {
    mutate: addRawMaterialCategory,
    isPending,
    isSuccess,
    isError,
    error,
  } = useAddRawMaterialCategory();

  const onSubmit = (data: FormValues) => {
    addRawMaterialCategory({
      name: data.name,
    });
    reset();
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-1 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 text-lg font-semibold">
            Raw Material Category
          </h1>

          <div className="col-span-12 mb-1 md:col-span-6">
            <GenericInputField
              name="name"
              label="Raw Material Category"
              placeholder="Enter Raw Material Category Name"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">
            {isPending ? 'Saving...' : 'Save'}
          </GenericButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default RawMaterialCategoryCateror;
