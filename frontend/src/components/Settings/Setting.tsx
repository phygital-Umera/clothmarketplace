import React from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import {settingSchema} from '@/lib/validation/settingSchema';

type FormValues = z.infer<typeof settingSchema>;

const Setting: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(settingSchema),
  });

  const {reset} = methods;

  const onSubmit = (data: FormValues) => {
    data ? reset() : '';
    console.log(data);
  };
  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        {/* Settings Form */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">Settings</h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="userId"
              label="UserID"
              placeholder="Enter your UserID"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="password"
              label="Password"
              placeholder="Enter the Password"
            />
          </div>
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">Save</GenericButton>
          {/* <GenericResetButton type="reset">Reset</GenericResetButton> */}
        </div>
      </form>
    </FormProvider>
  );
};

export default Setting;
