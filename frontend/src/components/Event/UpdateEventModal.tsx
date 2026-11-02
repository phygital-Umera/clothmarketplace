/* eslint-disable */
import {zodResolver} from '@hookform/resolvers/zod';
import {format} from 'date-fns';
import React, {useEffect} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {z} from 'zod';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import {
  useGetEventById,
  useUpdateEvent,
} from '@/lib/react-query/queriesAndMutations/cateror/event';

const eventValidationSchema = z.object({
  client: z.string(),
  eventName: z.string().nonempty('Event Name is required'),
  startDate: z.string().nonempty('Start Date is required'),
  startTime: z.string().nonempty('Start Time is required'),
  endDate: z.string().nonempty('End Date is required'),
  endTime: z.string().nonempty('End Time is required'),
  status: z.string().optional(),
});

type FormValues = z.infer<typeof eventValidationSchema>;

interface UpdateEventModalProps {
  showModal: boolean;
  onClose: () => void;
  eventData: any;
}

const UpdateEventModal: React.FC<UpdateEventModalProps> = ({
  showModal,
  onClose,
  eventData,
}) => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(eventValidationSchema),
    defaultValues: {
      client: '',
      eventName: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      status: '',
    },
  });

  const {handleSubmit, reset, setValue} = methods;

  const {mutate: updateEvent} = useUpdateEvent();
  const {data: eventDataApi, isSuccess} = useGetEventById(eventData.EventID);

  console.log(eventDataApi);

  useEffect(() => {
    if (eventDataApi?.data) {
      const {id, name, startDate, endDate, status, clientName} =
        eventDataApi.data;

      const [startDatePart, startTimePart] = startDate.split('T');
      const [endDatePart, endTimePart] = endDate.split('T');

      setValue('client', clientName || '');
      setValue('eventName', name || '');
      setValue('startDate', startDatePart);
      setValue('startTime', startTimePart?.slice(0, 5) || '');
      setValue('endDate', endDatePart);
      setValue('endTime', endTimePart?.slice(0, 5) || '');
      setValue('status', status || '');
    }
  }, [eventDataApi, setValue, isSuccess]);

  const handleFormSubmit = (formData: FormValues) => {
    const startDateTimeISO = new Date(
      `${formData.startDate}T${formData.startTime}`,
    ).toISOString();
    const endDateTimeISO = new Date(
      `${formData.endDate}T${formData.endTime}`,
    ).toISOString();

    updateEvent({
      id: eventData.EventID,
      status: formData.status!,
      name: formData.eventName,
      startDate: startDateTimeISO,
      endDate: endDateTimeISO,
    });

    onClose();
  };

  if (!showModal) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black bg-opacity-50"></div>

      <div className="fixed inset-0 z-999 flex items-center justify-center">
        <div className="w-full rounded-md bg-white p-6 shadow-lg dark:bg-black md:w-1/3">
          <div className="flex justify-between">
            <h3 className="mb-4 text-lg font-bold">Update Event</h3>
          </div>

          <FormProvider {...methods}>
            <form
              onSubmit={handleSubmit(handleFormSubmit)}
              className="space-y-4"
            >
              <GenericInputField name="client" label="Client" disabled />
              <GenericInputField
                name="eventName"
                label="Event Name"
                placeholder="Enter Event Name"
              />

              <div className="grid grid-cols-2 gap-4">
                <GenericInputField
                  name="startDate"
                  label="Start Date"
                  type="date"
                  disabled
                />
                <GenericInputField
                  name="startTime"
                  label="Start Time"
                  type="time"
                  defaultValue={format(new Date(), 'HH:mm')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <GenericInputField
                  name="endDate"
                  label="End Date"
                  type="date"
                />
                <GenericInputField
                  name="endTime"
                  label="End Time"
                  type="time"
                  defaultValue={format(new Date(), 'HH:mm')}
                />
              </div>
              <GenericSearchDropdown
                name="status"
                label="Status"
                options={[
                  {label: 'Enquiry', value: 'ENQUIRY'},
                  {label: 'Finalized', value: 'FINALIZED'},
                  {label: 'Preparation', value: 'PREPARATION'},
                  {label: 'Paid', value: 'PAID'},
                ]}
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    onClose();
                  }}
                  className="bg-gray-200 rounded border-2 border-stroke px-4 py-2"
                >
                  Cancel
                </button>
                <GenericButton type="submit">Update</GenericButton>
              </div>
            </form>
          </FormProvider>
        </div>
      </div>
    </>
  );
};

export default UpdateEventModal;
