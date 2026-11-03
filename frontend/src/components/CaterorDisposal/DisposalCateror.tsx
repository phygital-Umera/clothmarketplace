import React, {useEffect, useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import {useAddDisposal} from '@/lib/react-query/queriesAndMutations/cateror/disposal';
import {useGetDisposalCategories} from '@/lib/react-query/queriesAndMutations/cateror/disposal';
import {disposalSchemaa} from '@/lib/validation/disposalSchema';
import {toast} from 'react-hot-toast';

// Define the Category type
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

type FormValues = z.infer<typeof disposalSchemaa>;

const DisposalCateror: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(disposalSchemaa),
  });

  const {reset} = methods;
  const {mutate: addDisposal} = useAddDisposal();

  const {
    data: categoriesData,
    isLoading,
    isError,
    error,
  } = useGetDisposalCategories();

  const [categories, setCategories] = useState<Category[]>([]);

  // Use effect to process the fetched category data
  useEffect(() => {
    if (
      categoriesData &&
      categoriesData.status &&
      categoriesData.data &&
      Array.isArray(categoriesData.data.data)
    ) {
      const options: Category[] = categoriesData.data.data.map(
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
      (category) => category.id === data.disposalCategory,
    );

    if (!selectedCategory) {
      toast.error('Category not found');
      return;
    }

    if (!selectedCategory.languageId) {
      toast.error('Missing language ID');
      return;
    }

    try {
      await addDisposal({
        name: data.disposalName,
        categoryId: data.disposalCategory,
        languageId: selectedCategory.languageId,
      });

      reset(); // Reset form after successful submission
    } catch (error) {
      console.error('Error adding disposal:', error);
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">Disposal</h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="disposalName"
              label="Disposal Name"
              placeholder="Enter Disposal Name"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericSearchDropdown
              name="disposalCategory"
              label="Disposal Category"
              options={filteredCategories.map((category) => ({
                label: category.name,
                value: category.id,
              }))}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">Save</GenericButton>
          {/* <GenericResetButton type="reset">Reset</GenericResetButton> */}
        </div>
      </form>
    </FormProvider>
  );
};

export default DisposalCateror;
