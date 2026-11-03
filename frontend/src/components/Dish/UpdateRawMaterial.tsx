import React, {useEffect} from 'react';
import z from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, FormProvider} from 'react-hook-form';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import {updaterawMaterialValidationSchema} from '@/lib/validation/dishSchemas';
import {useGetRawMaterialByIdAdmin} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useUpdateRawMaterialAdmin} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useMatch, useNavigate} from '@tanstack/react-router';
// import toast from 'react-hot-toast';

type FormValues = z.infer<typeof updaterawMaterialValidationSchema>;

const UpdateRawMaterial: React.FC = () => {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const {params} = useMatch('/_app/_edit/update/$name/$id' as any);
  const {id = ''} = params as {id: string};

  const methods = useForm<FormValues>({
    resolver: zodResolver(updaterawMaterialValidationSchema),
  });

  const {reset} = methods;

  // Fetch raw material data by ID
  const {data: rawMaterial, error, isLoading} = useGetRawMaterialByIdAdmin(id);

  const {
    mutate: updateRawMaterialAdmin,
    isPending,
    isSuccess: isUpdateSuccess,
  } = useUpdateRawMaterialAdmin();

  useEffect(() => {
    if (rawMaterial) {
      console.log('Fetched raw material:', rawMaterial); // Log the fetched data
      reset({
        name: rawMaterial.name,
        unit: rawMaterial.unit,
      });
    }
  }, [rawMaterial, reset]);

  const onSubmit = (data: FormValues) => {
    const updateData = {
      name: data.name,
      id,
      languageId: rawMaterial.data?.languageId,
      categoryId: rawMaterial.data?.categoryId,
      unit: data.unit,
    };

    updateRawMaterialAdmin(
      {
        id,
        data: {
          categoryId: rawMaterial.data?.categoryId,
          name: data.name,
          unit: data.unit,
          languageId: rawMaterial.data?.languageId,
        },
      },
      {
        onSuccess: () => {
          navigate({to: '/admin/dish/AddRawMaterial'});
        },
      },
    );
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) {
    return <div>Error fetching Raw Material: {error.message}</div>;
  }

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Update Raw Material
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="name"
              label="Raw Material Name"
              placeholder="Enter raw material name"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericSearchDropdown
              name="unit"
              label="Unit"
              options={[
                {label: 'kg', value: 'KILOGRAM'},
                {label: 'bottle', value: 'BOTTLE'},
                {label: 'gm', value: 'GRAM'},
                {label: 'ltr', value: 'LITRE'},
                {label: 'pcs', value: 'PIECE'},
                {label: 'Pendhi', value: 'PENDHI'},
              ]}
            />
          </div>
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">
            {isPending ? 'Updating...' : 'Update'}
          </GenericButton>
          {/* <GenericResetButton type="reset">Reset</GenericResetButton> */}
        </div>

        {/* Error message for the update operation */}
        {/* {updateError && <div className="text-red-600">{updateError.message}</div>} */}
      </form>
    </FormProvider>
  );
};

export default UpdateRawMaterial;
