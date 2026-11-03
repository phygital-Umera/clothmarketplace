import React from 'react';
import z from 'zod';
import {useForm, FormProvider} from 'react-hook-form';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import {rawMaterialValidationSchema} from '@/lib/validation/dishSchemas';
import {
  useAddRawMaterialCateror,
  useGetRawMaterialCategoriesCat,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {useAuthContext} from '@/context/AuthContext';
// import toast from 'react-hot-toast';

type FormValues = z.infer<typeof rawMaterialValidationSchema>;

const AddRawMaterialCat: React.FC = () => {
  const {user} = useAuthContext();
  const methods = useForm<FormValues>({
    defaultValues: {
      name: '',
      rawMaterialCategory: '',
      unit: 'KILOGRAM',
    },
  });

  const {mutateAsync: addRawMaterial} = useAddRawMaterialCateror();
  const {data: categories} = useGetRawMaterialCategoriesCat();
  const mappedCategories = categories?.data.map(
    (category: {name: string; id: string}) => ({
      label: category.name,
      value: category.id,
    }),
  );

  const onSubmit = async (data: FormValues) => {
    console.log(data);

    try {
      const res = await addRawMaterial({
        name: data.name,
        categoryId: data.rawMaterialCategory,
        unit: data.unit,
        languageId: user?.languageId as string,
        amount: Number(data.amount),
      });
      // Show success toast
      // toast.success('Raw Material added successfully!');
      // Reset the form values after success
      methods.reset({
        name: '',
        rawMaterialCategory: '',
        unit: 'KILOGRAM',
      });
      console.log(res);
    } catch (error) {
      // Show error toast
      // toast.error('Failed to add Raw Material. Please try again.');
      console.log(error);
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        {/* Raw Material Form */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Raw Material
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
              name="rawMaterialCategory"
              options={mappedCategories || []}
              label="Category"
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <GenericSearchDropdown
              name="unit"
              label="Unit"
              options={[
                {label: 'Bottle', value: 'BOTTLE'},
                {label: 'gm', value: 'GRAM'},
                {label: 'Kg', value: 'KILOGRAM'},
                {label: 'ltr', value: 'LITRE'},
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

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">Save</GenericButton>
          {/* <GenericResetButton type="reset">Reset</GenericResetButton> */}
        </div>
      </form>
    </FormProvider>
  );
};

export default AddRawMaterialCat;
