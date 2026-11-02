import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {disposalcategorycaterorSchema} from '@/lib/validation/disposalSchema';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import {useAddDisposalCategory} from '@/lib/react-query/queriesAndMutations/cateror/disposal';
import {useEffect} from 'react';
import {languageId} from '@/lib/contants';
// import toast from 'react-hot-toast'; // Import toast

type FormValues = z.infer<typeof disposalcategorycaterorSchema>;

const DisposalCategoryCat: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(disposalcategorycaterorSchema),
  });

  const {reset} = methods;

  const {
    mutate: addDisposalCategory,
    isPending,
    isSuccess,
    isError,
    error,
  } = useAddDisposalCategory();

  const onSubmit = (data: FormValues) => {
    addDisposalCategory({
      name: data.disposalName,
      languageId: languageId,
    });
    reset();
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

export default DisposalCategoryCat;
