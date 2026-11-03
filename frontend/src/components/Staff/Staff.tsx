import React from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {staffSchema} from '@/lib/validation/staffSchema';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import {useCreateStaff} from '@/lib/react-query/queriesAndMutations/cateror/staff';
import {useModal} from '@/context/ModalContext';
import {caterorId} from '@/lib/contants';

type FormValues = z.infer<typeof staffSchema>;

const Staff: React.FC = () => {
  const {openModal} = useModal();

  const methods = useForm<FormValues>({
    resolver: zodResolver(staffSchema),
  });

  const {mutateAsync: createStaffMutation, isPending} = useCreateStaff();

  const onSubmit = async (data: FormValues) => {
    await createStaffMutation(
      {
        ...data, // Spread the form data
        caterorId: caterorId, // Add caterorId separately
      } as FormValues & {caterorId: string},
      {
        onSuccess: () => {
          methods.reset();
        },
      },
    );
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        {/* ePIN Registration Form */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">Staff</h1>

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
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </GenericButton>
          {/* <GenericResetButton type="reset">Reset</GenericResetButton> */}
        </div>
      </form>
    </FormProvider>
  );
};

export default Staff;
