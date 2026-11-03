/* eslint-disable */
import {useGetAllClient} from '@/lib/react-query/queriesAndMutations/cateror/client';
import {
  useCreateEvent,
  useGetAllEvents,
} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {zodResolver} from '@hookform/resolvers/zod';
import {useNavigate} from '@tanstack/react-router';
import {addDays, parse} from 'date-fns';
import React, {useEffect, useMemo, useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import toast from 'react-hot-toast';
import {z} from 'zod';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import {format} from 'date-fns';

// Create the schema for the whole object and then refine it
const eventValidationSchema = z
  .object({
    client: z.string().nonempty('Client is required'),
    eventName: z.string().nonempty('Event Name is required'),
    startDate: z.string().nonempty('Start Date is required'),
    startTime: z.string().nonempty('Start Time is required'),
    endTime: z.string().nonempty('End Time is required'),
    endDate: z.string().nonempty('End Date is required'),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'End Date must be after Start Date',
    path: ['endDate'],
  });

type FormValues = z.infer<typeof eventValidationSchema>;

interface EventModalProps {
  showModal: boolean;
  selectedDate: Date | null;
  onClose: () => void;
  onSave?: (data: FormValues) => void;
}

const EventModal: React.FC<EventModalProps> = ({
  showModal,
  selectedDate,
  onClose,
}) => {
  // Use addDays(selectedDate, 1) to get the correct start date.
  const defaultStartDate = selectedDate
    ? addDays(selectedDate, 1).toISOString().split('T')[0]
    : '';

  const methods = useForm<FormValues>({
    resolver: zodResolver(eventValidationSchema),
    defaultValues: {
      client: '',
      eventName: '',
      startDate: defaultStartDate,
      endDate: defaultStartDate, // Set endDate to match startDate initially
    },
  });

  if (!showModal) return null;
  const {handleSubmit, reset, setValue} = methods;

  const {data: clients} = useGetAllClient();
  const {mutate: createEvent, isSuccess, isError} = useCreateEvent();

  const [FormattedClients, setFormattedClients] = useState<any>([]);

  useMemo(() => {
    const formatted =
      clients?.data?.map((client: {id: string; user: {fullname: string}}) => ({
        label: client.user.fullname,
        value: client.id,
      })) || [];
    setFormattedClients(formatted);
  }, [clients]);

  const {data: eventsData} = useGetAllEvents(); // Fetch all events

  const handleFormSubmit = (formData: FormValues) => {
    const existingEvents = eventsData?.data?.events || [];
    const isEventNameExist = existingEvents.some(
      (event: {name: string}) => event.name === formData.eventName,
    );

    if (isEventNameExist) {
      toast.error('Event name already exists!');
      return;
    }
    // Combine date and time, and convert to UTC ISO string
    const startDateTimeISO = new Date(
      `${formData.startDate}T${formData.startTime}`,
    ).toISOString();
    const endDateTimeISO = new Date(
      `${formData.endDate}T${formData.endTime}`,
    ).toISOString();

    createEvent({
      clientId: formData.client,
      name: formData.eventName,
      startDate: startDateTimeISO,
      endDate: endDateTimeISO,
    });
  };

  // Update endDate whenever selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const newStartDate = addDays(selectedDate, 1).toISOString().split('T')[0];
      setValue('startDate', newStartDate); // Update startDate
      setValue('endDate', newStartDate); // Sync endDate with startDate
    }
  }, [selectedDate, setValue]);

  useEffect(() => {
    if (isSuccess) {
      // toast.success('Event created successfully');
      reset(); // Reset the form after submission
      onClose(); // Close the modal
    }
    if (isError) {
      // toast.error('Failed to create event');
    }
  }, [isError, isSuccess, reset, onClose]);

  const navigate = useNavigate();
  const navigateToCustomer = () => {
    navigate({
      to: '/client',
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black bg-opacity-50"></div>

      {/* Modal */}
      <div className="fixed inset-0 z-999 flex items-center justify-center">
        <div className="w-full rounded-md bg-white p-6 shadow-lg dark:bg-black md:w-1/3">
          <div className="flex justify-between">
            <h3 className="mb-4 text-lg font-bold">Add Event</h3>
            <GenericButton onClick={navigateToCustomer}>
              Add Customer
            </GenericButton>
          </div>

          <FormProvider {...methods}>
            <form
              onSubmit={handleSubmit(handleFormSubmit)}
              className="space-y-4"
            >
              <GenericSearchDropdown
                name="client"
                label="Client"
                options={FormattedClients || []}
              />
              <GenericInputField
                name="eventName"
                label="Event Name"
                placeholder="Enter Event Name"
              />

              <div className="grid grid-cols-2 gap-4">
                <GenericInputField
                  name="startDate"
                  label="Start Date"
                  placeholder="Select Start Date"
                  type="date"
                  disabled
                />
                <GenericInputField
                  name="startTime"
                  label="Start Time"
                  placeholder="Select Start Time"
                  type="time"
                  defaultValue={format(new Date(), 'HH:mm')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <GenericInputField
                  name="endDate"
                  label="End Date"
                  placeholder="Select End Date"
                  type="date"
                />
                <GenericInputField
                  name="endTime"
                  label="End Time"
                  placeholder="Select End Time"
                  type="time"
                  defaultValue={format(new Date(), 'HH:mm')}
                />
              </div>

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
                <GenericButton type="submit">Save & Proceed</GenericButton>
              </div>
            </form>
          </FormProvider>
        </div>
      </div>
    </>
  );
};

export default EventModal;
