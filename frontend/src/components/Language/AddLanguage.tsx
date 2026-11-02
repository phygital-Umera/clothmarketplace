import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import {zodResolver} from '@hookform/resolvers/zod';
import {languageSchema} from '@/lib/validation/languageSchema';
import {useAddLanguage} from '@/lib/react-query/queriesAndMutations/admin/languages';
// import {toast} from 'react-hot-toast'; // Import toast

type FormValues = z.infer<typeof languageSchema>;

const AddLanguage: React.FC = () => {
  const {mutate: addLanguage, isPending, isSuccess, isError} = useAddLanguage(); // Access the mutation

  // Initialize the form with zod validation
  const methods = useForm<FormValues>({
    resolver: zodResolver(languageSchema),
  });

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    addLanguage(data, {onSuccess: () => methods.reset()});
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit, (errors) => {
          console.log('Validation errors: ', errors); // Log validation errors if any
        })}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">Language</h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="name"
              label="Enter the Language"
              placeholder="Enter the Language"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="code"
              label="Enter the Code"
              placeholder="Enter the Code"
            />
          </div>
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">
            {isPending ? 'Adding...' : 'Add'}
          </GenericButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default AddLanguage;
