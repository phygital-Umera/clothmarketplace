import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {updatemaharajSchema} from '@/lib/validation/maharajSchema';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import GenericButton from '../Forms/Buttons/GenericButton';
import {useUpdateMaharaj} from '@/lib/react-query/queriesAndMutations/cateror/maharaj';
import {useGetMaharajById} from '@/lib/react-query/queriesAndMutations/cateror/maharaj'; // Import the hook
import {useNavigate} from '@tanstack/react-router';
// import toast from 'react-hot-toast';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';

type FormValues = z.infer<typeof updatemaharajSchema>;

interface Props {
  id: string;
}

const UpdateMaharaj: React.FC<Props> = ({id}) => {
  const navigate = useNavigate();
  const methods = useForm<FormValues>({
    resolver: zodResolver(updatemaharajSchema),
  });

  const {mutateAsync: updateMaharaj, isPending} = useUpdateMaharaj();
  const {data: maharajData, isLoading, error} = useGetMaharajById(id); // Use the hook to fetch data
  console.log('  maharajData:', maharajData);

  // Set form values when data is available
  useEffect(() => {
    if (maharajData) {
      // Prepare the data for the form fields
      const formValues = {
        fullName: maharajData.user.fullname,
        specialization: Array.isArray(maharajData.specialization)
          ? maharajData.specialization.join(', ')
          : maharajData.specialization || '', // Convert array to comma-separated string
        experience: maharajData.experience,
        fullname: maharajData.user.fullname,
      };
      methods.reset(formValues); // Reset the form with the fetched data
    }
  }, [maharajData, methods]); // Run when maharajData changes

  const onSubmit = async (data: FormValues) => {
    try {
      // The specialization will now be guaranteed to be an array of strings
      const specializationArray = Array.isArray(data.specialization)
        ? data.specialization
        : []; // Fallback to an empty array if somehow not an array

      await updateMaharaj({
        id: id,
        data: {
          ...data,
          specialization: specializationArray,
        },
      });
      // toast.success('Maharaj updated successfully!');
    } catch (error) {
      // toast.error('Update failed. Please try again.');/
    }
    navigate({
      to: '/users/maharaj',
    });
  };
  // Display loading state or error message
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error fetching data: {error.message}</p>;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit, () => {})}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">Maharaj</h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="fullname"
              label="Full Name"
              placeholder="Enter your Full Name"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="email"
              label="Email"
              placeholder="Enter the Email"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="phoneNumber"
              label="Phone Number"
              placeholder="Enter the Phone Number"
            />
          </div>

          <div className="col-span-12 md:col-span-full">
            <GenericTextArea
              name="address"
              label="Residential Address"
              placeholder="Enter the Residential Address"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="specialization"
              label="Specialization"
              placeholder="Enter your Specialization (comma-separated)"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="experience"
              label="Experience"
              placeholder="Enter the Experience"
            />
          </div>
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit" disabled={isPending}>
            {isPending ? 'Updating...' : 'Update'}
          </GenericButton>
          {/* <GenericResetButton type="reset">Reset</GenericResetButton> */}
        </div>
      </form>
    </FormProvider>
  );
};

export default UpdateMaharaj;
