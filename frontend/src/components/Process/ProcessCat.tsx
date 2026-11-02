import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import {processSchema} from '@/lib/validation/processSchema';
// import {useAuthContext} from '@/context/AuthContext';
import {useAddProcess} from '@/lib/react-query/queriesAndMutations/cateror/process';
import {useEffect} from 'react';
// import toast from 'react-hot-toast';

type FormValues = z.infer<typeof processSchema>;

const ProcessCat: React.FC = () => {
  // const {user} = useAuthContext();
  const methods = useForm<FormValues>({
    // resolver: zodResolver(processSchema),
    defaultValues: {
      name: '',
    },
  });

  const {mutateAsync: addProcess, isSuccess} = useAddProcess();

  const {reset} = methods;

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await addProcess({
        name: data.name,
      });
      console.log(res);
      // toast.success('Process added successfully');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // Check if the error message indicates the process already exists
      if (
        error.response?.status === 409 ||
        error.response?.data?.message === 'Process already exists'
      ) {
        // toast.error('Process already exists');
      } else {
        // toast.error('An error occurred while adding the process');
        // console.error(error);
      }
    }
  };

  useEffect(() => {
    if (isSuccess) {
      reset(); // Optionally reset the form after submission
    }
  }, [isSuccess, reset]);

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
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">Save</GenericButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default ProcessCat;
