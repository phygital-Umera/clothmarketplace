import React from 'react';
import z from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, FormProvider} from 'react-hook-form';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import {eventValidationSchema} from '@/lib/validation/eventSchema';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import {useGetAllClient} from '@/lib/react-query/queriesAndMutations/cateror/client';

type FormValues = z.infer<typeof eventValidationSchema>;

const AddEvent: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(eventValidationSchema),
    defaultValues: {
      EventName: '',
      StartDate: '',
      EndDate: '',
    },
  });

  const {reset} = methods;

  const onSubmit = (data: FormValues) => {
    data ? reset() : '';
    console.log(data);
  };

  const {data: client} = useGetAllClient();
  console.log(client);

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        {/* ePIN Registration Form */}
        <div className="grid grid-cols-1 gap-4 text-left md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">Dish</h1>

          <div className="col-span-12 md:col-span-12">
            <GenericInputField
              name="EventName"
              label="Event Name"
              placeholder="Enter Event name"
            />
          </div>

          <div className="col-span-12 md:col-span-12">
            <GenericInputField
              name="StartDate"
              label="Start Date"
              placeholder="Event Start Date"
              type="date"
            />
          </div>
          <div className="col-span-12 md:col-span-12">
            <GenericInputField
              name="EndDate"
              label="EndDate"
              placeholder="EndDate"
              type="date"
            />
          </div>
        </div>

        {/* Form Buttons */}
        <div className="flex justify-center">
          <GenericButton type="submit">Create</GenericButton>
          <GenericResetButton type="reset">Cancle</GenericResetButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default AddEvent;
