import React, {useEffect, useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import GenericInputField from '../Forms/Input/GenericInputField';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import {rawmaterialcategorySchema} from '@/lib/validation/rawmaterialSchema';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useAddRawMaterialCategoryAdmin} from '@/lib/react-query/queriesAndMutations/admin/dish';
import GenericButton from '../Forms/Buttons/GenericButton';
// import toast from 'react-hot-toast';

type FormValues = z.infer<typeof rawmaterialcategorySchema>;

interface Language {
  id: string;
  name: string;
}

const RawMaterialCategory: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(rawmaterialcategorySchema),
  });

  const {
    mutate: addRawMaterialCategoryAdmin,
    isPending,
    isSuccess,
    isError,
  } = useAddRawMaterialCategoryAdmin();

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

  const onSubmit = (data: FormValues) => {
    addRawMaterialCategoryAdmin({
      name: data.name,
      languageId: data.language,
    });
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Raw Material Category
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="name"
              label="Raw Material Category"
              placeholder="Enter Raw Material Category Name"
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <GenericSearchDropdown
              name="language"
              label="Language"
              options={languageOptions}
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

export default RawMaterialCategory;
