import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {updatevendorSchema} from '@/lib/validation/vendorSchema';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import {
  useGetVendorById,
  useUpdateVendor,
} from '@/lib/react-query/queriesAndMutations/cateror/vendor';
import GenericInputField from '../Forms/Input/GenericInputField';
import {useNavigate} from '@tanstack/react-router';
import {useModal} from '@/context/ModalContext';
import {caterorId} from '@/lib/contants';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';

type FormValues = z.infer<typeof updatevendorSchema>;
interface Props {
  id: string;
}

const UpdateVendor: React.FC<Props> = ({id}) => {
  const navigate = useNavigate();

  const methods = useForm<FormValues>({
    resolver: zodResolver(updatevendorSchema),
  });

  const {reset} = methods;

  // Use the hook to fetch vendor data
  const {data, isLoading, error} = useGetVendorById(id);
  console.log('Vendor Data:', data);

  const {
    mutate: updateVendorMutation,
    isPending,
    isError,
    isSuccess,
  } = useUpdateVendor();
  const {openModal} = useModal();

  useEffect(() => {
    if (data) {
      // Reset form with fetched vendor data
      reset({
        category: data?.category || '',
        email: data?.user?.email || '',
        fullname: data?.user?.fullname || '',
        phoneNumber: data?.user?.phoneNumber || '',
        username: data?.user?.username || '',
        address: data?.user?.address || '',
      });
    }
  }, [data, reset]);

  // const onSubmit = (formData: FormValues) => {
  //   // Call the update vendor API
  //   updateVendorMutation.mutate({id, updateData: formData});
  // };

  const onSubmit = async (data: FormValues) => {
    const isAvailable = data.isAvailable === 'true' ? true : false;
    console.log('IsAvailable:::', isAvailable);
    // Check if the user ID (caterorId) is valid
    if (!caterorId) {
      console.error('Cateror ID is not valid');
      openModal('ERROR', <p>Unable to add Maharaj: Invalid Cateror ID.</p>);
      return;
    }

    try {
      const response = updateVendorMutation({
        fullname: data.fullname || '',
        address: data.address || '',
        category: data.category,
        email: data.email,
        isAvailable: isAvailable,
        password: data.password,
        phoneNumber: data.phoneNumber,
        username: data.username,
      });
      navigate({
        to: '/users/vendor', // Redirect after update
      });
      console.log(response);

      openModal('SUCCESS', <p>Vendor Added Successfully!</p>);
      methods.reset();
    } catch (error) {
      console.error('Error adding Vendor:', error);
      openModal('ERROR', <p>Failed to add Vendor. Please try again.</p>);
    }
  };
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error fetching vendor data: {error.message}</div>;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        {/* Vendor Registration Form */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Update Vendor
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="fullname"
              label="Full Name"
              placeholder="Enter your Full Name"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="phoneNumber"
              label="Phone Number"
              placeholder="Enter the Phone Number"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="email"
              label="Email Address"
              placeholder="Enter your Email Address"
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
              name="username"
              label="Username"
              placeholder="Enter your Username"
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="password"
              label="Password"
              placeholder="Enter your Password"
              type="password" // Make sure to set type to password for security
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericSearchDropdown
              name="category"
              label="Vendor Category"
              options={[
                {label: 'Option1', value: '1'},
                {label: 'Option2', value: '2'},
                {label: 'Option3', value: '3'},
              ]}
              defaultOption=""
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <GenericSearchDropdown
              name="isAvailable"
              label="Availability"
              options={[
                {label: 'Available', value: 'true'},
                {label: 'Unavailable', value: 'false'},
              ]}
              defaultOption=""
            />
          </div>
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </GenericButton>
          <GenericResetButton type="reset" onClick={() => reset()}>
            Reset
          </GenericResetButton>
        </div>

        {isSuccess && (
          <p className="text-green-600">Vendor added successfully!</p>
        )}
        {isError && <p className="text-red-600">Failed to add vendor.</p>}
      </form>
    </FormProvider>
  );
};

export default UpdateVendor;
