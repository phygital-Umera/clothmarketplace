import React, {useEffect, useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import GenericInputField from '../Forms/Input/GenericInputField';
import {useAddDishCategoryAdmin} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
// import toast from 'react-hot-toast';

// Define form values type
type FormValues = {
  name: string;
  languageId: string;
};

interface Language {
  id: string;
  name: string;
}

const DishCategory: React.FC = () => {
  const methods = useForm<FormValues>({
    defaultValues: {
      name: '',
      languageId: '',
    },
  });

  const {reset} = methods; // Destructure reset from methods to clear form
  const {mutateAsync: addDishCategory} = useAddDishCategoryAdmin();
  const [languageOptions, setLanguageOptions] = useState([]);
  const {data: languages} = useGetLanguages();

  useEffect(() => {
    if (languages) {
      const options = languages.map((language: Language) => ({
        label: language.name,
        value: language.id,
      }));
      setLanguageOptions(options);
    }
  }, [languages]);

  const onSubmit = async (data: FormValues) => {
    try {
      await addDishCategory({
        name: data.name,
        languageId: data.languageId,
      });

      reset({
        name: '',
        languageId: '',
      });
    } catch (error) {
      console.error('Error adding dish category:', error);
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
            Dish Category
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
              defaultOption=""
            />
          </div>

          <div className="col-span-2 flex items-end md:col-span-2">
            <button
              type="submit"
              className="w-full rounded bg-primary p-3 text-white"
            >
              Add
            </button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default DishCategory;
