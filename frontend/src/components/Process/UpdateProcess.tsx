import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import {updateprocessSchema} from '@/lib/validation/processSchema';
import {useMatch, useNavigate} from '@tanstack/react-router';
import {
  useGetProcessById,
  useUpdateProcess,
} from '@/lib/react-query/queriesAndMutations/admin/process';
// import toast from 'react-hot-toast';
// import GenericTable from '../Forms/Table/GenericTable';

type FormValues = z.infer<typeof updateprocessSchema>;

const UpdateProcess: React.FC = () => {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const {params} = useMatch('/_app/_edit/update/process/$id' as any);
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
    // Check if the name hasn't changed
    if (data.name === process.name) {
      // toast.error('No changes made. The name is the same.');
      return; // Prevent update if name is the same
    }

    const updateData = {
      name: data.name,
      languageId: process.languageId, // Assuming the process has languageId
      id,
    };

    // Proceed with update if name has changed
    updateProcess({
      id,
      updateData,
    });

    // toast.success('Process updated successfully!');
    navigate({
      to: `/admin/dish/process`, // Redirect after successful update
    });
  };

  // Effect to handle success or error after submission
  useEffect(() => {
    if (isUpdateSuccess) {
      reset();
      console.log('Process updated successfully');
    } else if (isError) {
      console.error(error);
      // toast.error('Something went wrong while updating the process');
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
      <div></div>
    </FormProvider>
  );
};

export default UpdateProcess;
