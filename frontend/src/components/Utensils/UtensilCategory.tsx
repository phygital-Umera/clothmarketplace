import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {utensilcategorySchema} from '@/lib/validation/utensilSchema';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import {useAddUtensilCategory} from '@/lib/react-query/queriesAndMutations/admin/utensils';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import {useEffect, useState} from 'react';
// import toast from 'react-hot-toast'; // Import toast

type FormValues = z.infer<typeof utensilcategorySchema>;

interface Language {
  id: string; // or number, depending on your data
  name: string;
}

const UtensilCategory: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(utensilcategorySchema),
  });

  const {reset} = methods;

  const {
    mutate: addUtensilCategory,
    isPending,
    isSuccess,
    isError,
    error,
  } = useAddUtensilCategory();

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
    addUtensilCategory(
      {
        name: data.utensilCategoryName,
        languageId: data.language,
      },
      {onSuccess: () => reset()},
    );
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        {/* Utensil Category Form */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Utensil Category
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="utensilCategoryName"
              label="Utensil Category Name"
              placeholder="Enter Utensil Category"
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

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">
            {isPending ? 'Saving...' : 'Save'}
          </GenericButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default UtensilCategory;
