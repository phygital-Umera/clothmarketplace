import React from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {maharajSchema} from '@/lib/validation/maharajSchema';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import GenericButton from '../Forms/Buttons/GenericButton';
import {useCreateMaharaj} from '@/lib/react-query/queriesAndMutations/cateror/maharaj';
import {useModal} from '@/context/ModalContext';
import {zodResolver} from '@hookform/resolvers/zod';
import {caterorId} from '@/lib/contants';
// import toast from 'react-hot-toast';

type FormValues = z.infer<typeof maharajSchema>;

const Maharaj: React.FC = () => {
  const {openModal} = useModal();

  const methods = useForm<FormValues>({
    resolver: zodResolver(maharajSchema),
  });

  const {mutateAsync: addMaharaj, isPending} = useCreateMaharaj();

  const onSubmit = async (data: FormValues) => {
    console.log('Dataaataa:::', data);
    if (!caterorId) {
      console.error('Cateror ID is not valid');
      openModal('ERROR', <p>Unable to add Maharaj: Invalid Cateror ID.</p>);
      return;
    }

    try {
      const res = await addMaharaj({
        ...data, // Spread the form data
        caterorId: caterorId, // Add caterorId separately
      } as FormValues & {caterorId: string}); // Cast the object to include caterorId
      if (res) {
        methods.reset();
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit, () => {})}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-2">
          <h1 className="col-span-12 text-lg font-semibold">Maharaj</h1>

          <div className="col-span-12 md:col-span-4">
            <GenericInputField
              name="fullname"
              label="Full Name"
              placeholder="Enter your Full Name"
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <GenericInputField
              name="email"
              label="Email"
              placeholder="Enter the Email"
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <GenericInputField
              name="phoneNumber"
              label="Phone Number"
              placeholder="Enter the Phone Number"
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <GenericInputField
              name="specialization"
              label="Specialization"
              placeholder="Enter your Specialization (comma-separated)"
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <GenericInputField
              name="experience"
              label="Experience"
              placeholder="Enter the Experience"
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
          <GenericButton type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </GenericButton>
          {/* <GenericResetButton type="reset">Reset</GenericResetButton> */}
        </div>
      </form>
    </FormProvider>
  );
};

export default Maharaj;
