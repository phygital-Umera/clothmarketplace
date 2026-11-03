import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {disposalcategorySchema} from '@/lib/validation/disposalSchema';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import {useAddDisposalCategory} from '@/lib/react-query/queriesAndMutations/admin/disposal';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import {useEffect, useState} from 'react';
// import toast from 'react-hot-toast'; // Import toast

type FormValues = z.infer<typeof disposalcategorySchema>;

type Language = {
  id: string; // or number, depending on your data
  name: string;
};

const DisposalCategory: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(disposalcategorySchema),
  });

  const {
    mutate: addDisposalCategory,
    isPending,
    isSuccess,
    isError,
    error,
  } = useAddDisposalCategory();

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
    addDisposalCategory({
      name: data.disposalName,
      languageId: data.language,
    });
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        {/* Disposal Category Form */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Disposal Category
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="disposalName"
              label="Disposal Category Name"
              placeholder="Enter Disposal Category"
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

export default DisposalCategory;
