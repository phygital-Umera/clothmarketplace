import React, {useEffect, useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import {useAddUtensil} from '@/lib/react-query/queriesAndMutations/cateror/utensils';
import {useGetUtensilCategories} from '@/lib/react-query/queriesAndMutations/cateror/utensils';
import {utensilSchema} from '@/lib/validation/utensilSchema';
// import {toast} from 'react-hot-toast';

// Define the Category type
type Category = {
  id: string;
  name: string;
  languageId: string; // Ensure this is included
  isActive: boolean;
};

type FetchedCategory = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  languageId: string;
};

type FormValues = z.infer<typeof utensilSchema>;

const UtensilCat: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(utensilSchema),
  });

  const {reset} = methods;
  const {mutate: addUtensil} = useAddUtensil();

  // Fetch categories and handle loading and errors
  const {
    data: categoriesData,
    isLoading,
    isError,
    error,
  } = useGetUtensilCategories();

  // Use state for categories
  const [categories, setCategories] = useState<Category[]>([]);

  // Effect to set categories from the fetched data
  useEffect(() => {
    if (categoriesData && Array.isArray(categoriesData.data)) {
      const options: Category[] = categoriesData?.data.map(
        (category: FetchedCategory) => ({
          id: category.id,
          name: category.name,
          languageId: category.languageId, // Get the languageId from fetched data
          isActive: true, // Set to true or adjust this as necessary
        }),
      );
      setCategories(options);
    }
  }, [categoriesData]);

  const onSubmit = (data: FormValues) => {
    const selectedCategory = categories.find(
      (category) => category.id === data.utensilCategory,
    );

    // Ensure that the selected category has a valid languageId
    if (!selectedCategory || !selectedCategory.languageId) {
      return;
    }

    // Proceed with adding the utensil
    addUtensil(
      {
        name: data.utensilName,
        categoryId: data.utensilCategory,
        languageId: selectedCategory.languageId, // Use the correct languageId
      },
      {
        onSuccess: () => {
          reset();
        },
      },
    );
  };

  if (isLoading) return <div>Loading categories...</div>;
  if (isError) return <div>Error fetching categories: {error.message}</div>;

  // Filter active categories if needed
  const filteredCategories = categories.filter((category) => category.isActive); // Adjust condition as necessary

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        {/* Utensil Form */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">Utensil</h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="utensilName"
              label="Utensil Name"
              placeholder="Enter Utensil Name"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericSearchDropdown
              name="utensilCategory"
              label="Utensil Category"
              options={filteredCategories.map((category) => ({
                label: category.name,
                value: category.id,
              }))}
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

export default UtensilCat;
