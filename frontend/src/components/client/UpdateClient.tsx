import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import {updateClientValidationSchema} from '@/lib/validation/clientSchemas';
import {useMatch, useNavigate} from '@tanstack/react-router';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import {
  useGetClientById,
  useUpdateClient,
} from '@/lib/react-query/queriesAndMutations/cateror/client';
// import toast from 'react-hot-toast';

type FormValues = z.infer<typeof updateClientValidationSchema>;

const UpdateClient: React.FC = () => {
  const navigate = useNavigate();
  /* eslint-disable */
  const {params} = useMatch('/_app/_edit/update/client/$id' as any);
  const {id = ''} = params as {id: string};

  const methods = useForm<FormValues>({
    resolver: zodResolver(updateClientValidationSchema),
  });

  const {setValue} = methods;
  // Fetch process data by ID
  const {data: client, isSuccess} = useGetClientById(id);

  console.log(client);
  // Use the update process mutation
  const {
    mutate: UpdateClient,
    isPending,
    isSuccess: isUpdateSuccess,
    isError,
    error,
  } = useUpdateClient();

  // Set form values when process data is successfully fetched
  useEffect(() => {
    if (isSuccess && client) {
      setValue('fullname', client?.user?.fullname || '');
      setValue('caste', client?.caste || '');
      setValue('address', client?.address || '');
      setValue('email', client?.user?.email || '');
      setValue('phoneNo', client?.user?.phoneNumber || '');
      setValue('secondaryPhoneNo', client?.user?.secondaryPhoneNumber || '');
    }
  }, [isSuccess, client, setValue]);
  // console.log("fullname", client.user.fullname)

  // Handle form submission
  const onSubmit = (data: FormValues) => {
    console.log('Form submitted:', data);

    UpdateClient({
      id,
      data: {
        fullname: data.fullname,
        caste: data.caste,
        address: data.address,
        phoneNumber: data.phoneNo,
        email: data.email,
        secondaryPhoneNumber: data.secondaryPhoneNo,
      },
    });
  };

  // Effect to handle success or error after submission
  useEffect(() => {
    if (isUpdateSuccess) {
      navigate({
        to: `/client`, // Redirect after successful update
      });
    }
  }, [isUpdateSuccess, isError, error]);

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Update Client
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="fullname"
              label="Client Name"
              placeholder="Enter Client Name"
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="caste"
              label="Caste"
              placeholder="Enter Caste"
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="phoneNo"
              label="Phone No"
              placeholder="Enter Phone No"
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="secondaryPhoneNo"
              label="Secondary Phone No"
              placeholder="Enter Secondary Phone No"
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="email"
              label="Email"
              placeholder="Enter Email"
            />
          </div>
          <div className="col-span-12 md:col-span-12">
            <GenericTextArea
              name="address"
              label="Address"
              placeholder="Enter Address"
            />
          </div>
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit" disabled={isPending}>
            {isPending ? 'Updating...' : 'Update'}
          </GenericButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default UpdateClient;
