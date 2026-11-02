import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import {updateprocessSchema} from '@/lib/validation/processSchema';
import {useMatch, useNavigate} from '@tanstack/react-router';
import {
  useGetProcessById,
  useUpdateProcess,
} from '@/lib/react-query/queriesAndMutations/cateror/process';
// import toast from 'react-hot-toast';

interface ApiError extends Error {
  data?: {
    message: string;
  };
}
type FormValues = z.infer<typeof updateprocessSchema>;

const UpdateProcessCateror: React.FC = () => {
  const navigate = useNavigate();
  /* eslint-disable */
  const {params} = useMatch('/_app/_edit/update/processCateror/$id' as any);
  const {id = ''} = params as {id: string};

  const methods = useForm<FormValues>({
    resolver: zodResolver(updateprocessSchema),
  });

  const {reset, setValue, handleSubmit} = methods;

  // Fetch process data by ID
  const {data: process, isSuccess} = useGetProcessById(id);

  // Use the update process mutation
  const {
    mutate: updateProcess,
    isPending,
    isSuccess: isUpdateSuccess,
    isError,
    error,
  } = useUpdateProcess();

  // Set form values when process data is successfully fetched
  useEffect(() => {
    if (isSuccess && process) {
      setValue('name', process.name || '');
    }
  }, [isSuccess, process, setValue]);

  // Handle form submission
  const onSubmit = (data: FormValues) => {
    const updateData = {
      name: data.name,
      languageId: process?.languageId, // Assuming the process has languageId
      id,
    };

    updateProcess({
      id,
      updateData: data,
    });
  };

  // Effect to handle success or error after submission
  useEffect(() => {
    if (isUpdateSuccess) {
      // toast.success('Process updated successfully');
      reset();
      navigate({to: `/process`}); // Navigate to the process page
    } else if (isError) {
      const errorMessage =
        (error as ApiError).data?.message || 'An error occurred while updating';
      // toast.error(errorMessage); // Show a specific or generic error message
      // console.error(error);
    }
  }, [isUpdateSuccess, isError, error, reset, navigate]);

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Update Process
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="name"
              label="Process"
              placeholder="Enter Process Name"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">
            {isPending ? 'Updating...' : 'Update'}
          </GenericButton>
          {/* <GenericResetButton type="reset">Reset</GenericResetButton> */}
        </div>
      </form>
    </FormProvider>
  );
};

export default UpdateProcessCateror;
