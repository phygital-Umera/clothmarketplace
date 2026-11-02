import React from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {CreateEventSchema} from '@/lib/validation/eventSchema';
import GenericInputField from '../../components/Forms/Input/GenericInputField';
import GenericButton from '../../components/Forms/Buttons/GenericButton';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import {z} from 'zod';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import {useGetAllClient} from '@/lib/react-query/queriesAndMutations/cateror/client';
import {Client} from '@/types/cateror';
// import {useCreateEvent} from '@/lib/react-query/queriesAndMutations/cateror/event';

type FormValues = z.infer<typeof CreateEventSchema>;

const Event: React.FC = () => {
  // Initialize form methods with schema validation and default values
  const methods = useForm<FormValues>({
    // resolver: zodResolver(CreateEventSchema),
    defaultValues: {
      ClientName: '',
      Mobile1: '',
      Mobile2: '',
      ResidentialAddress: '',
      EventAddress: '',
      Caste: '',
    },
  });

  // const {mutate: createEvent} = useCreateEvent();

  const {data: clientResponse} = useGetAllClient();
  console.log(' clientResponse::', clientResponse);
  const mappedClient = clientResponse?.data.map((client: Client) => ({
    label: client.user.fullname,
    value: client.id,
  }));

  const onSubmit = (data: FormValues) => {
    console.log(data); // Process form data
    // createEvent(data);
    // methods.reset();
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        {/* Form Title */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Create Event
          </h1>

          {/* Client Name Input Field */}
          <div className="col-span-12 md:col-span-12">
            <GenericSearchDropdown
              name="ClientName"
              label="Client Name"
              options={mappedClient || []}
            />
          </div>

          {/* Mobile1 Input Field */}
          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="Mobile1"
              label="Mobile 1"
              placeholder="Enter Primary Mobile Number"
            />
          </div>

          {/* Mobile2 Input Field */}
          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="Mobile2"
              label="Mobile 2"
              placeholder="Enter Secondary Mobile Number"
            />
          </div>

          {/* Residential Address Input Field */}
          <div className="col-span-12 md:col-span-full">
            <GenericTextArea
              name="ResidentialAddress"
              label="Residential Address"
              placeholder="Enter Residential Address"
            />
          </div>

          {/* Event Address Input Field */}
          <div className="col-span-12 md:col-span-full">
            <GenericTextArea
              name="EventAddress"
              label="Event Address"
              placeholder="Enter Event Address"
            />
          </div>

          {/* Caste Input Field */}
          <div className="col-span-12 md:col-span-12">
            <GenericSearchDropdown
              name="Caste"
              label="Caste"
              options={[
                {label: 'Option1', value: '1'},
                {label: 'Option2', value: '2'},
                {label: 'Option3', value: '3'},
              ]}
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

export default Event;
