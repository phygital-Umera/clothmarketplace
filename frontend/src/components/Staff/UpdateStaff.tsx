import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {updatestaffSchema} from '@/lib/validation/staffSchema';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import {useGetStaffById} from '@/lib/react-query/queriesAndMutations/cateror/staff';
import {useUpdateStaff} from '@/lib/react-query/queriesAndMutations/cateror/staff';
import {useNavigate} from '@tanstack/react-router';

type FormValues = z.infer<typeof updatestaffSchema>;

interface Props {
  id: string;
}

const UpdateStaff: React.FC<Props> = ({id}) => {
  const navigate = useNavigate();
  const methods = useForm<FormValues>({
    resolver: zodResolver(updatestaffSchema),
  });

  const {reset} = methods;

  // Fetch staff data by ID
  const {data: staffData, isLoading} = useGetStaffById(id);

  // Mutation hook for updating staff
  const {mutate: updateStaff, isPending: isUpdating} = useUpdateStaff();

  // Update the form fields when staff data is fetched
  useEffect(() => {
    if (staffData) {
      reset({
        jobTitle: staffData.jobTitle,
        address: staffData.address,
      });
    }
  }, [staffData, reset]);

  const onSubmit = (data: FormValues) => {
    updateStaff({id, data}); // Trigger the mutation to update the staff
    navigate({
      to: '/users/staff', // Redirect after update
    });
  };

  if (isLoading) {
    return <div>Loading...</div>; // You can show a loader while data is being fetched
  }

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Update Staff
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="jobTitle"
              label="Job Title"
              placeholder="Enter your Job Title"
            />
          </div>

          <div className="col-span-12 md:col-span-full">
            <GenericTextArea
              name="address"
              label="Residential Address"
              placeholder="Enter the Residential Address"
            />
          </div>
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit" disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Update'}
          </GenericButton>
          {/* <GenericResetButton type="reset">Reset</GenericResetButton> */}
        </div>
      </form>
    </FormProvider>
  );
};

export default UpdateStaff;
