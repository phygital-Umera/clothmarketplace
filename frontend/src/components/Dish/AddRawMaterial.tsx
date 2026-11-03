import React, {useEffect, useState} from 'react';
import z from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, FormProvider} from 'react-hook-form';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import {rawMaterialValidationSchema} from '@/lib/validation/dishSchemas';
import {
  useAddRawMaterialAdmin,
  useGetRawMaterialCategoriesAdmin,
} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {toast} from 'react-hot-toast';

type Category = {
  id: string;
  name: string;
  languageId: string;
  isActive: boolean;
};

type FetchedCategory = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  languageId: string;
};

type FormValues = z.infer<typeof rawMaterialValidationSchema>;

const AddRawMaterial: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(rawMaterialValidationSchema),
  });

  const {
    mutate: addRawMaterialAdmin,
    isSuccess,
    isError: addrawerror,
  } = useAddRawMaterialAdmin();
  const {
    data: categoriesData,
    isLoading,
    isError,
    error,
  } = useGetRawMaterialCategoriesAdmin();

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (
      categoriesData &&
      categoriesData.status &&
      categoriesData.data &&
      Array.isArray(categoriesData.data)
    ) {
      const options: Category[] = categoriesData.data.map(
        (category: FetchedCategory) => ({
          id: category.id,
          name: category.name,
          languageId: category.languageId,
          isActive: true,
        }),
      );
      setCategories(options);
    }
  }, [categoriesData]);

  const onSubmit = async (data: FormValues) => {
    const selectedCategory = categories.find(
      (category) => category.id === data.rawMaterialCategory,
    );

    if (!selectedCategory || !selectedCategory.languageId) {
      toast.error('Invalid language ID for the selected category');
      return;
    }

    try {
      await addRawMaterialAdmin({
        name: data.name,
        unit: data.unit,
        categoryId: data.rawMaterialCategory,
        languageId: selectedCategory.languageId,
      });
    } catch (error) {
      console.error('Error saving raw material');
    }
  };

  if (isLoading) return <div>Loading categories...</div>;
  if (isError) return <div>Error fetching categories: {error.message}</div>;

  const filteredCategories = categories.filter((category) => category.isActive);

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
              label="Raw Material Category"
              options={filteredCategories.map((category) => ({
                label: category.name,
                value: category.id,
              }))}
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
                {label: 'meter', value: 'METER'},
              ]}
            />
          </div>
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">Save</GenericButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default AddRawMaterial;
