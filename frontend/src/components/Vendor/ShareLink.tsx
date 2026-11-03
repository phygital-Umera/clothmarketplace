import React from 'react';
import GenericInputField from '@/components/Forms/Input/GenericInputField';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {useAuthContext} from '@/context/AuthContext';
// import {toast} from 'react-hot-toast';
import {FiCopy} from 'react-icons/fi';
import {shareLinkSchema} from '@/lib/validation/vendorSchema';

type FormValues = z.infer<typeof shareLinkSchema>;

interface SponserInfoProps {
  onNext: () => void;
}

export const ShareLink: React.FC<SponserInfoProps> = ({onNext}) => {
  const {user} = useAuthContext(); // Get user data from context
  // console.log('user', user);

  // const registrationLink = `http://localhost:5173/externalvendor/${user?.fullname.replace(/\s/g, '_')}/${user?.caterorId}`;
  const registrationLink = `https://menubook.cc/externalvendor/${user?.fullname.replace(/\s/g, '_')}/${user?.caterorId}`;
  const methods = useForm<FormValues>({
    resolver: zodResolver(shareLinkSchema),
    defaultValues: {
      sponsorId: user?.caterorId,
      link: registrationLink,
    },
  });

  //   const {setSponsorInfo} = useRegistration();

  // Handle form submission
  const onSubmit = (formValues: FormValues) => {
    console.log('formValues', formValues);
    // setSponsorInfo({
    //   selfSide:
    //     formValues.selfSide === 'LEFT' || formValues.selfSide === 'RIGHT'
    //       ? formValues.selfSide
    //       : 'LEFT', // Ensure selfSide is either "LEFT" or "RIGHT"
    //   sponsorId: formValues.sponsorId,
    // });
    onNext();
  };

  // Create the dynamic registration URL with crnNo and name

  // Copy the generated URL to the clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(registrationLink);
    // toast.success('Copied to clipboard');
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="mb-10 space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">Share Link</h1>

          {/* Share Link Section */}
          <div className="col-span-12 flex items-center gap-2">
            <GenericInputField name="link" label="Link to Share" disabled />
            <button
              type="button"
              onClick={handleCopy} // Copy button functionality
              className="text-gray-600 dark:text-gray-300 mt-8 p-5 hover:text-blue-500"
              aria-label="Copy link"
            >
              <FiCopy size={20} />
            </button>
          </div>
        </div>
      </form>
      {/* <EmailChange /> */}
    </FormProvider>
  );
};
