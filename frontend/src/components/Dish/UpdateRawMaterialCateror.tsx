import React, {useEffect, useState} from 'react';
import z from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, FormProvider} from 'react-hook-form';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import {useMatch, useNavigate} from '@tanstack/react-router';
import {updaterawmaterialcategoryCaterorSchema} from '@/lib/validation/rawmaterialSchema';
import {
  useGetRawMaterialById,
  useGetRawMaterialCategoriesCat,
  useUpdateRawMaterialsCateror,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {Route} from '@/routes/_app/_edit/update.$name.$id';
// import toast from 'react-hot-toast';

type FormValues = z.infer<typeof updaterawmaterialcategoryCaterorSchema>;

// interface props {
//   id: string;
// }

const UpdateRawMaterialCateror: React.FC = () => {
  const navigate = useNavigate();
  const {id, name} = Route.useParams();

  // const {data: rawMaterialResponse, isSuccess} = useGetRawMaterialById(id);
  const methods = useForm<FormValues>({
    resolver: zodResolver(updaterawmaterialcategoryCaterorSchema),
  });

  const {reset, setValue} = methods;
  const {data: categories, isSuccess: isCategoriesSucess} =
    useGetRawMaterialCategoriesCat();

  const [mappeddata, setMappeddata] = useState([]);

  const {data: rawMaterialCategoryCateror, isSuccess} =
    useGetRawMaterialById(id);

  console.log(rawMaterialCategoryCateror);

  const {
    mutate: updateRawMaterialsCateror,
    isSuccess: isUpdateSuccess,
    isPending,
    isError,
    error,
  } = useUpdateRawMaterialsCateror();

  useEffect(() => {
    if (isSuccess && rawMaterialCategoryCateror?.data) {
      setValue('name', rawMaterialCategoryCateror.data.name);
    }
  }, [isSuccess, rawMaterialCategoryCateror, setValue]);

  useEffect(() => {
    if (isSuccess && rawMaterialCategoryCateror?.data) {
      reset({
        name: rawMaterialCategoryCateror.data.name,
        category: rawMaterialCategoryCateror.data?.categoryId,
        unit: rawMaterialCategoryCateror?.data?.unit,
      });
    }
  }, [isSuccess, rawMaterialCategoryCateror, reset]);

  useEffect(() => {
    const mappedCategories = categories?.data.map(
      (category: {name: string; id: string}) => ({
        label: category.name,
        value: category.id,
      }),
    );
    setMappeddata(mappedCategories);
  }, [categories, isCategoriesSucess]);

  const onSubmit = (data: FormValues) => {
    console.log(data);

    updateRawMaterialsCateror({
      id,
      data: {
        name: data.name,
        amount: Number(data.amount),
      },
    });
  };

  useEffect(() => {
    if (isUpdateSuccess) {
      navigate({to: '/AddRawMaterial'});
    }
  }, [isUpdateSuccess, navigate]);

  useEffect(() => {
    if (isSuccess && rawMaterialCategoryCateror?.data) {
      reset({
        name: rawMaterialCategoryCateror.data.name,
        category: rawMaterialCategoryCateror.data?.categoryId,
        unit: rawMaterialCategoryCateror?.data?.unit,
        amount: rawMaterialCategoryCateror?.data?.amount,
      });
    }
  }, [isSuccess, rawMaterialCategoryCateror?.data]);

  const mappedCategories =
    categories?.data.map((category: {name: string; id: string}) => ({
      label: category.name,
      value: category.id,
    })) || [];

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <h1 className="mb-4 text-lg font-semibold">Update Raw Material</h1>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="name"
              label="Raw Material Name"
              placeholder="Enter raw material name"
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <GenericSearchDropdown
              name="category"
              label="Category"
              options={mappedCategories}
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <GenericSearchDropdown
              name="unit"
              label="Unit"
              options={[
                {label: 'kg', value: 'KILOGRAM'},
                {label: 'gm', value: 'GRAM'},
                {label: 'Bottel', value: 'BOTTLE'},
                {label: 'litr', value: 'LITRE'},
              ]}
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="amount"
              label="Amount"
              placeholder="Enter raw material amount"
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

export default UpdateRawMaterialCateror;
