import React from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';

const UpdateCustomerList = () => {
  const methods = useForm(); // Initialize the form methods from react-hook-form

  const handleFormSubmit = (data) => {
    console.log('Form submitted', data); // Log form data on submission
  };

  return (
    <div className="space-y-8 bg-white p-8 dark:bg-black">
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(handleFormSubmit)}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
            <h1 className="col-span-12 mb-4 text-lg font-semibold">
              Update Customer List
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

          <div className="flex justify-end space-x-4">
            <GenericButton type="submit">Update</GenericButton>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default UpdateCustomerList;
