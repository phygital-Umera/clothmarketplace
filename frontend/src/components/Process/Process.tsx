import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';

import {processSchema} from '@/lib/validation/processSchema';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import {useEffect, useState} from 'react';
import {useAddProcess} from '@/lib/react-query/queriesAndMutations/admin/process';

type FormValues = z.infer<typeof processSchema>;

interface Language {
  id: string; // or number, depending on your data
  name: string;
}

const Process: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(processSchema),
  });

  const {mutate: addProcess} = useAddProcess();

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
    addProcess(data);
    console.log(data);

    // });
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">Process</h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="name"
              label="Process"
              placeholder="Enter Process"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericSearchDropdown
              name="languageId"
              label="Language"
              options={languageOptions}
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

export default Process;
