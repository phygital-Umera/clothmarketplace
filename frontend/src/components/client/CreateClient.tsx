import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import {useEffect} from 'react';
import {clientValidationSchema} from '@/lib/validation/clientSchemas';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import {useCreateClient} from '@/lib/react-query/queriesAndMutations/cateror/client';

type FormValues = z.infer<typeof clientValidationSchema>;

const CreateClient: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(clientValidationSchema),
  });

  const {reset} = methods;
  const {
    mutate: CreateClient,
    isSuccess,
    isPending,
    isError,
  } = useCreateClient();

  const generateRandomNumbers = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const onSubmit = (data: FormValues) => {
    console.log(data);

    const generatedEmail = `client${data.phoneNo}${generateRandomNumbers()}@gmail.com`;

    CreateClient({
      fullname: data.fullname,
      address: data.address,
      username: data.phoneNo,
      email: generatedEmail || 'default@gmail.com',
      phoneNumber: data.phoneNo,
      secondaryPhoneNumber: data.secondaryPhoneNo
        ? data.secondaryPhoneNo
        : undefined,
      caste: data.caste ? data.caste : '',
    });
    console.log(data);
  };

  useEffect(() => {
    if (isSuccess) {
      reset();
    }
    if (isError) {
      reset();
    }
  }, [isSuccess, reset, isError]);

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Create Client
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
          {/* <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="email"
              label="Email"
              placeholder="Enter Email"
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="username"
              label="Username"
              placeholder="Enter Username"
            />
          </div> */}
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
            {isPending ? 'Saving...' : 'Save'}
          </GenericButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default CreateClient;
