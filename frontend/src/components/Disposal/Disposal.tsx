import React, {useEffect, useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericButton from '../Forms/Buttons/GenericButton';
import {useAddDisposal} from '@/lib/react-query/queriesAndMutations/admin/disposal';
import {useGetDisposalCategories} from '@/lib/react-query/queriesAndMutations/admin/disposal';
import {disposalSchemaa} from '@/lib/validation/disposalSchema';
// import toast from 'react-hot-toast';

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

const Disposal: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(disposalSchemaa),
  });

  const {mutate: addDisposal} = useAddDisposal();

  const {
    data: categoriesData,
    isLoading,
    isError,
    error,
  } = useGetDisposalCategories();

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (categoriesData?.data) {
      const options: Category[] = categoriesData?.data?.data.map(
        (category: FetchedCategory) => ({
          id: category.id,
          name: category.name,
          languageId: category.languageId,
        }),
      );
      setCategories(options);
    }
  }, [categoriesData]);

  const onSubmit = (data: FormValues) => {
    const selectedCategory = categories.find(
      (category) => category.id === data.disposalCategory,
    );

    if (!selectedCategory || !selectedCategory.languageId) {
      return;
    }

    addDisposal({
      name: data.disposalName,
      categoryId: data.disposalCategory,
      languageId: selectedCategory.languageId,
    });
  };

  if (isLoading) return <div>Loading categories...</div>;
  if (isError) return <div>Error fetching categories: {error.message}</div>;

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
              options={categories.map((category) => ({
                label: category.name,
                value: category.id,
              }))}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">Save</GenericButton>
        </div>
      </form>
    </FormProvider>
  );
};

// Add ToastContainer outside your component, probably in your main file (like App.tsx)
export default Disposal;
