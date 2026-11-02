import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {utensilcategorycaterorSchema} from '@/lib/validation/utensilSchema';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import {useAddUtensilCategory} from '@/lib/react-query/queriesAndMutations/cateror/utensils';
import {languageId} from '@/lib/contants';
// import toast from 'react-hot-toast';

type FormValues = z.infer<typeof utensilcategorycaterorSchema>;

const UtensilCategoryCat: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(utensilcategorycaterorSchema),
  });

  const {reset} = methods;

  const {
    mutate: addUtensilCategory,
    isPending,
    isSuccess,
    isError,
    error,
  } = useAddUtensilCategory();

  const onSubmit = (data: FormValues) => {
    addUtensilCategory({
      name: data.utensilCategoryName,
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
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">
            {isPending ? 'Saving...' : 'Save'}
          </GenericButton>
          {/* <GenericResetButton type="reset">Reset</GenericResetButton> */}
        </div>
      </form>
    </FormProvider>
  );
};

export default UtensilCategoryCat;
