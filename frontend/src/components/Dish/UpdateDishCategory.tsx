import React, {useEffect, useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
// import {toast} from 'react-hot-toast';
import GenericInputField from '../Forms/Input/GenericInputField';
import {useUpdateDishCategoryAdmin} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {dishCategoryValidationSchema} from '@/lib/validation/dishSchemas';
import {zodResolver} from '@hookform/resolvers/zod';
import z from 'zod';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import {useGetDishCategoryByIdAdmin} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useMatch, useNavigate} from '@tanstack/react-router';
import GenericButton from '../Forms/Buttons/GenericButton';

interface Props {
  id: string;
}

interface Language {
  id: string;
  name: string;
}

type FormValues = z.infer<typeof dishCategoryValidationSchema>;

const UpdateDishCategory: React.FC<Props> = () => {
  const navigate = useNavigate();
  const methods = useForm<FormValues>({
    resolver: zodResolver(dishCategoryValidationSchema),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const {params} = useMatch('/_app/_edit/update/dishCategory/$id' as any);
  const {id = ''} = params as {id: string};

  const {mutateAsync: updateDishCategory} = useUpdateDishCategoryAdmin();
  const {data: dishCategory, refetch} = useGetDishCategoryByIdAdmin(id);

  const {data: languages} = useGetLanguages();
  const [languageOptions, setLanguageOptions] = useState<
    {label: string; value: string}[]
  >([]);

  // Populate language options
  useEffect(() => {
    if (languages) {
      const options = languages.map((language: Language) => ({
        label: language.name,
        value: language.id,
      }));
      setLanguageOptions(options);
    }
  }, [languages]);

  // Reset form when dish category data is available
  useEffect(() => {
    if (dishCategory) {
      methods.reset({
        name: dishCategory.name,
        languageId: dishCategory.languageId,
      });
      refetch();
    }
  }, [dishCategory, methods, navigate]);

  const onSubmit = async (data: FormValues) => {
    try {
      if (data.name.trim() === dishCategory?.name.trim()) {
        // toast.error('The name is already the same. Please enter a new name.');
        return;
      }

      await updateDishCategory({
        id: dishCategory.id,
        name: data.name,
        languageId: dishCategory.languageId,
      });

      navigate({to: '/admin/dish/dishCategory'});
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Update Dish Category
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="name"
              label="Dish Category Name"
              placeholder="Enter dish category name"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericSearchDropdown
              name="languageId"
              label="Language"
              options={languageOptions}
            />
          </div>

          <div className="col-span-2 flex items-end md:col-span-2">
            <GenericButton type="submit">Update</GenericButton>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default UpdateDishCategory;
