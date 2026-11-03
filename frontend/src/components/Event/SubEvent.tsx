/* eslint-disable */
import {
  useGetDishCategories,
  useGetDishes,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {
  useCreateSubevent,
  useGetSubevent,
} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {CreateSubEventSchema} from '@/lib/validation/eventSchema';
import {zodResolver} from '@hookform/resolvers/zod';
import {useMatch} from '@tanstack/react-router';
import React, {useEffect, useMemo, useState} from 'react';
import {Controller, FormProvider, useForm} from 'react-hook-form';
import Select from 'react-select';
import {z} from 'zod';
import GenericButton from '../../components/Forms/Buttons/GenericButton';
import GenericInputField from '../../components/Forms/Input/GenericInputField';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericDropdown from '../Forms/DropDown/GenericDropDown';
import SubEventList from './SubEventList';
import {Route} from '@/routes/_app/_event/events.$id';
import toast from 'react-hot-toast';
import {format} from 'date-fns';
import {BiLoader, BiPaperPlane, BiSave} from 'react-icons/bi';

export type SubEventFormValues = z.infer<typeof CreateSubEventSchema>;

const SubEventForm: React.FC = () => {
  const {params} = useMatch('/_app/_event/update/events/$id' as any);
  const {id = ''} = params as {id: string};
  const {id: EventId} = Route.useParams();

  const methods = useForm<SubEventFormValues & {universalDish: string}>({
    resolver: zodResolver(CreateSubEventSchema),
    defaultValues: {
      subEventName: '',
      date: '',
      time: '',
      dishes: {},
      universalDish: '',
    },
  });

  const {watch, setValue, getValues} = methods;

  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  useEffect(() => {
    setStartDate(localStorage.getItem('startDate'));
    setEndDate(localStorage.getItem('endDate'));
  }, []);

  const minDate = startDate;
  const maxDate = endDate;
  const {data: DishCategories} = useGetDishCategories();
  const {data: Dishes} = useGetDishes();

  const {
    mutate: createSubevent,
    isPending,
    isSuccess,
    isError,
  } = useCreateSubevent();
  const {data: subEventResponse, isLoading: isLoadingSubEvents} =
    useGetSubevent(EventId);

  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);

  const handleDishSelect = (categoryName: string, selectedOptions: any) => {
    const selectedDishIds = selectedOptions?.map((option: any) => option.value);
    setSelectedDishes((prevSelectedDishes) => [
      ...prevSelectedDishes,
      ...selectedDishIds.filter(
        (id: string) => !prevSelectedDishes.includes(id),
      ),
    ]);
  };

  const generateDateOptions = (start: string | null, end: string | null) => {
    if (!start || !end) return [];

    const startDate = new Date(start);
    const endDate = new Date(end);
    const dateArray = [];

    while (startDate <= endDate) {
      dateArray.push({
        value: startDate.toISOString().split('T')[0],
        label: format(startDate, 'dd-MMM-yyyy'),
      });
      startDate.setDate(startDate.getDate() + 1);
    }

    return dateArray;
  };

  const dateOptions = generateDateOptions(startDate, endDate);

  const onSubmit = (data: SubEventFormValues) => {
    const isNameAlreadyExist = subEventResponse?.data?.subEvents?.some(
      (subEvent: any) => subEvent.name === data.subEventName,
    );

    if (isNameAlreadyExist) {
      toast.error('Sub Event name already exists');
      return;
    }

    const combinedDateTime = `${data.date}T${data.time}:00+05:30`;

    const formattedDishes = selectedDishes?.map((dishId) => ({
      dishId,
    }));

    const selectedDate = methods.watch('date');

    const formData = {
      name: data.subEventName,
      address: data.subEventAddress || '',
      dishes: formattedDishes,
      expectedPeople: data.expectedPeople,
      time: combinedDateTime,
      date: selectedDate,
      eventId: id,
    };

    console.log('Formatted Form Data:', formData);

    createSubevent(formData);
  };

  const universalDish = watch('universalDish');

  const allDishOptions = useMemo(() => {
    return (
      Dishes?.data?.dishes.map((d: any) => ({
        value: d.id,
        label: d.name,
        categoryId: d.categoryId,
        categoryName: d.category?.name,
      })) || []
    );
  }, [Dishes]);

  useEffect(() => {
    if (!universalDish) return;
    const selectedDish = allDishOptions.find((d) => d.value === universalDish);
    if (!selectedDish) return;

    const fieldName = `dishes.${selectedDish.categoryName?.replace(/\s+/g, '')}`;
    const existing = getValues(fieldName) || [];

    if (!existing.some((item: any) => item.value === selectedDish.value)) {
      const newEntry = {value: selectedDish.value, label: selectedDish.label};
      setValue(fieldName, [...existing, newEntry]);
      handleDishSelect(selectedDish.categoryName || '', [
        ...existing,
        newEntry,
      ]);
    }

    setValue('universalDish', '');
  }, [universalDish, allDishOptions, setValue, getValues]);

  return (
    <>
      {isLoadingSubEvents ? (
        <div className="mb-20 mt-4">Loading sub-events...</div>
      ) : subEventResponse?.data?.subEvents?.length > 0 ? (
        <div className="mt-4">
          <SubEventList />
        </div>
      ) : (
        <div className="text-gray-500 dark:text-gray-400 mb-20 mt-4 flex items-center justify-center">
          No sub-events found. Create one to get started.
        </div>
      )}
      <FormProvider {...methods}>
        <form className="space-y-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
            <h1 className="col-span-12 bg-gray-2 p-4 text-lg font-semibold dark:bg-meta-4">
              Create Sub Event
            </h1>

            <div className="col-span-12 md:col-span-3">
              <GenericInputField
                name="subEventName"
                label="Sub Event Name"
                placeholder="Enter Sub Event Name"
              />
            </div>

            <div className="col-span-12 md:col-span-12">
              <GenericTextArea
                name="subEventAddress"
                label="Sub Event Address"
                placeholder="Enter Sub Event Address"
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <GenericInputField
                name="expectedPeople"
                label="Expected People"
                placeholder="Enter Expected People"
                type="number"
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <GenericInputField
                name="time"
                label="Time"
                placeholder="Select Time"
                type="time"
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <GenericDropdown
                name="date"
                label="Date"
                options={dateOptions}
                control={methods.control}
              />
            </div>

            {/* 🔄 Universal Dish Selector */}
            <div className="col-span-12 md:col-span-12">
              <GenericSearchDropdown
                name="universalDish"
                label="Universal Dish Selector"
                options={allDishOptions.map(({value, label}) => ({
                  value,
                  label,
                }))}
              />
            </div>

            {/* 🧾 Dish Categories Table */}
            <div className="col-span-12 md:col-span-12">
              <div className="rounded-sm bg-white dark:border-strokedark dark:bg-boxdark">
                <div className="max-w-full overflow-x-auto">
                  <table className="mb-20 w-full table-auto">
                    <thead>
                      <tr className="bg-gray-2 text-left dark:bg-meta-4">
                        <th className="px-4 py-4 text-center font-medium text-black dark:text-white">
                          Dish Category
                        </th>
                        <th className="px-4 py-4 text-center font-medium text-black dark:text-white">
                          Dish
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {DishCategories?.data?.categories?.map(
                        (category: {id: string; name: string}) => {
                          const fieldName = `dishes.${category.name.replace(/\s+/g, '')}`;
                          return (
                            <tr
                              key={category.id}
                              className="border-b border-stroke dark:border-strokedark"
                            >
                              <td className="px-4 py-4 text-center">
                                {category.name}
                              </td>
                              <td className="px-4 py-4">
                                <Controller
                                  name={fieldName}
                                  control={methods.control}
                                  render={({field}) => (
                                    <Select
                                      {...field}
                                      isMulti
                                      options={Dishes?.data?.dishes
                                        ?.filter(
                                          (dish) =>
                                            dish.categoryId === category.id,
                                        )
                                        ?.map((dish) => ({
                                          label: dish.name,
                                          value: dish.id,
                                        }))}
                                      onChange={(selectedOptions) => {
                                        handleDishSelect(
                                          category.name,
                                          selectedOptions,
                                        );
                                        field.onChange(selectedOptions);
                                      }}
                                      className="w-full"
                                      classNames={{
                                        control: (state) =>
                                          `border border-gray-300 bg-white text-black placeholder:text-gray-500
                                          dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-400
                                          ${state.isFocused ? 'border-gray-400 dark:border-slate-600' : ''}`,
                                        menu: () =>
                                          `bg-white text-black border border-gray-300 shadow-md
                                          dark:bg-slate-800 dark:text-white dark:border-slate-700`,
                                        option: (state) =>
                                          `px-3 py-2 cursor-pointer 
                                          ${state.isFocused ? 'bg-gray-200 dark:bg-slate-700' : ''}
                                          ${state.isSelected ? 'bg-gray-300 dark:bg-slate-900 text-black dark:text-white' : ''}`,
                                        singleValue: () =>
                                          `text-black dark:text-white`,
                                        multiValue: () =>
                                          `bg-gray-200 text-black dark:bg-slate-700 dark:text-white rounded-md px-2 py-1`,
                                        multiValueLabel: () =>
                                          `text-black dark:text-white`,
                                        multiValueRemove: () =>
                                          `text-black dark:text-white hover:bg-red-400 hover:text-white dark:hover:bg-red-600`,
                                      }}
                                    />
                                  )}
                                />
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={methods.handleSubmit(onSubmit)}
              className="flex transform items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg"
            >
              {isPending ? (
                <BiLoader className="animate-spin" />
              ) : (
                <BiSave className="text-lg" />
              )}
              <span>{isPending ? 'Submitting...' : 'Submit'}</span>
            </button>
          </div>
        </form>
      </FormProvider>
    </>
  );
};

export default SubEventForm;
