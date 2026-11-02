/* eslint-disable */
import React, {useEffect, useMemo, useState} from 'react';
import {useForm, FormProvider, Controller} from 'react-hook-form';
import Select from 'react-select';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  CreateSubEventSchema,
  subEventSchema,
} from '@/lib/validation/eventSchema';
import GenericInputField from '../../components/Forms/Input/GenericInputField';
import GenericButton from '../../components/Forms/Buttons/GenericButton';
import {
  useGetDishCategories,
  useGetDishes,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {z} from 'zod';
import {
  useGetSubeventById,
  useUpdateSubEvent,
} from '@/lib/react-query/queriesAndMutations/cateror/event';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import {Route} from '@/routes/_app/_event/update-subevent.$id';
import {useNavigate} from '@tanstack/react-router';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';

export type SubEventFormValues = z.infer<typeof subEventSchema>;

const UpdateSubEvent: React.FC = () => {
  const {id: subEventId} = Route.useParams();
  const navigate = useNavigate();
  const {data: subEventResponse} = useGetSubeventById(subEventId);

  const methods = useForm<SubEventFormValues>({
    resolver: zodResolver(subEventSchema),
  });

  const {watch, setValue, getValues, reset} = methods;
  const {data: DishCategories} = useGetDishCategories();
  const {data: Dishes} = useGetDishes();
  const {mutate: updateSubEvent, isPending, isSuccess} = useUpdateSubEvent();
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const handleDishSelect = (categoryId: string, selectedOptions: any) => {
    const selectedDishIdsForCategory = selectedOptions.map(
      (opt: any) => opt.value,
    );

    const categoryDishIds =
      Dishes?.data?.dishes
        .filter((d: any) => d.categoryId === categoryId)
        .map((d: any) => d.id) || [];

    setSelectedDishes((prev) => [
      ...prev.filter((id) => !categoryDishIds.includes(id)),
      ...selectedDishIdsForCategory,
    ]);
  };

  const onSubmit = async (data: SubEventFormValues) => {
    const combinedDateTime = `${data.date}T${data.time}:00+05:30`;

    const formattedDishes = selectedDishes.map((dishId) => ({dishId}));

    const formData = {
      name: data.name,
      address: data.address,
      dishes: formattedDishes,
      time: combinedDateTime,
      date: data.date,
      eventId: subEventResponse?.data?.subevent?.eventId,
      subEventId: subEventId,
      expectedPeople: Number(data.expectedPeople) || 0,
    };

    updateSubEvent(formData);

    navigate({to: `/events/${subEventResponse?.data?.subevent?.eventId}`});
  };

  useEffect(() => {
    if (!subEventResponse?.data) return;

    const utcTime = subEventResponse?.data?.subevent?.time;
    const localTime = utcTime
      ? new Date(utcTime).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : '';

    const selectedDishIds =
      subEventResponse?.data?.subevent?.dishes?.map(
        (dish: any) => dish.dishId,
      ) || [];
    setSelectedDishes(selectedDishIds);

    reset({
      name: subEventResponse?.data?.subevent?.name || '',
      address: subEventResponse?.data?.subevent?.address || '',
      date: formatDate(subEventResponse?.data?.subevent?.date),
      time: localTime,
      expectedPeople:
        subEventResponse?.data?.subevent?.expectedPeople?.toString() || '',
    });
  }, [subEventResponse, reset]);

  const universalDish = watch('universalDish');

  const allDishOptions = useMemo(() => {
    return (
      Dishes?.data?.dishes.map((d: any) => ({
        value: d.id,
        label: d.name,
        categoryId: d.categoryId,
      })) || []
    );
  }, [Dishes]);

  useEffect(() => {
    if (!universalDish) return;

    const selectedDish = allDishOptions.find((d) => d.value === universalDish);
    if (!selectedDish) return;

    const fieldName = `category_${selectedDish.categoryId}`;
    const existing = getValues(fieldName) || [];

    const alreadyExists = existing.some(
      (item: any) => item.value === selectedDish.value,
    );
    if (!alreadyExists) {
      const newEntry = {value: selectedDish.value, label: selectedDish.label};
      const updated = [...existing, newEntry];

      setValue(fieldName, updated);
      handleDishSelect(selectedDish.categoryId, updated);
    }

    setValue('universalDish', '');
  }, [universalDish, allDishOptions, getValues, setValue]);

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Update Sub Event
          </h1>

          <div className="col-span-12">
            <GenericInputField
              name="name"
              label="Sub Event Name"
              placeholder="Enter Sub Event Name"
            />
          </div>

          <div className="col-span-12">
            <GenericTextArea
              name="address"
              label="Sub Event Address"
              placeholder="Enter Sub Event Address"
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <GenericInputField
              name="expectedPeople"
              label="Expected People"
              placeholder="Enter Expected People"
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <GenericInputField
              name="date"
              label="Date"
              placeholder="Select Date"
              type="date"
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

          <div className="col-span-12">
            <GenericSearchDropdown
              name="universalDish"
              label="Universal Dish Selector"
              options={allDishOptions.map(({value, label}) => ({value, label}))}
            />
          </div>

          <div className="col-span-12">
            <div className="rounded-sm bg-white dark:border-strokedark dark:bg-boxdark">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full table-auto">
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
                    {DishCategories?.data?.categories?.map((category: any) => {
                      const fieldName = `category_${category.id}`;
                      return (
                        <tr
                          key={category.id}
                          className="border-b border-[#eee] px-4 py-5 dark:border-strokedark"
                        >
                          <td className="px-4 py-4 text-center">
                            {category.name}
                          </td>
                          <td className="px-4 py-4">
                            <Controller
                              name={fieldName}
                              control={methods.control}
                              defaultValue={
                                Dishes?.data?.dishes
                                  .filter(
                                    (dish: any) =>
                                      dish.categoryId === category.id &&
                                      selectedDishes.includes(dish.id),
                                  )
                                  .map((dish: any) => ({
                                    label: dish.name,
                                    value: dish.id,
                                  })) || []
                              }
                              render={({field}) => (
                                <Select
                                  {...field}
                                  isMulti
                                  options={
                                    Dishes?.data?.dishes
                                      .filter(
                                        (dish: any) =>
                                          dish.categoryId === category.id,
                                      )
                                      .map((dish: any) => ({
                                        label: dish.name,
                                        value: dish.id,
                                      })) || []
                                  }
                                  value={
                                    Dishes?.data?.dishes
                                      .filter(
                                        (dish: any) =>
                                          dish.categoryId === category.id &&
                                          selectedDishes.includes(dish.id),
                                      )
                                      .map((dish: any) => ({
                                        label: dish.name,
                                        value: dish.id,
                                      })) || []
                                  }
                                  onChange={(selectedOptions) => {
                                    handleDishSelect(
                                      category.id,
                                      selectedOptions,
                                    );
                                    field.onChange(selectedOptions);
                                  }}
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
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <GenericButton
            type="button"
            onClick={() => navigate({to: `/events/${subEventId}`})}
          >
            Cancel
          </GenericButton>
          <GenericButton type="submit">
            {isPending ? 'Submitting...' : 'Submit'}
          </GenericButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default UpdateSubEvent;
