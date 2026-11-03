/* eslint-disable  */

import React, {useEffect, useRef, useState} from 'react';
import {
  FormProvider,
  useFieldArray,
  useForm,
  UseFormReturn,
} from 'react-hook-form';
import GenericSearchDropdown from '@/components/Forms/SearchDropDown/GenericSearchDropdown';
import GenericInputField from '@/components/Forms/Input/GenericInputField';
import GenericButton from '@/components/Forms/Buttons/GenericButton';
import {
  useBulkAddDishWastage,
  useGetSubevent,
  useGetWastages,
} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {BiChevronDown, BiChevronUp} from 'react-icons/bi';
import {FiSave} from 'react-icons/fi';
import {Route} from '@/routes/_app/_event/events.$id';

type FormValues = {
  subeventId: string;
  wastages: {
    categoryId: string;
    dishId: string;
    measurement: string;
    quantity: number;
    dishname: string;
    categoryname: string;
  }[];
};

interface Dish {
  id: string;
  dishId: string;
  dish: {
    id: string;
    name: string;
    categoryId: string;
    category: {
      id: string;
      name: string;
    };
  };
}

interface SubEvent {
  id: string;
  name: string;
  dishes: Dish[];
}

interface DishWastagePropTypes {
  subEvent: SubEvent;
}

const DishWastage: React.FC<DishWastagePropTypes> = ({subEvent}) => {
  const {id: EventId} = Route.useParams<{id: string}>();
  const methods: UseFormReturn<FormValues> = useForm<FormValues>({
    defaultValues: {
      subeventId: subEvent.id,
      wastages: [],
    },
  });

  const tableRef = useRef<HTMLDivElement>(null);
  const {
    control,
    setValue,
    handleSubmit,
    watch,
    formState: {isSubmitting},
  } = methods;
  const {fields} = useFieldArray({
    name: 'wastages',
    control,
  });

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const {mutateAsync: bulkAddDishWastage} = useBulkAddDishWastage();
  const {data: wastagesData} = useGetWastages(EventId);

  useEffect(() => {
    if (subEvent.dishes) {
      const wastageMap = new Map(
        wastagesData?.data?.subEvents
          ?.find((se: SubEvent) => se.id === subEvent.id)
          ?.wastage?.map((w: any) => [w.dishId, w]),
      );

      const transformData = subEvent.dishes.map((dish) => {
        const existingWastage = wastageMap.get(dish.dish.id);
        return {
          categoryId: dish.dish.categoryId,
          dishId: dish.dish.id,
          dishname: dish.dish.name,
          categoryname: dish.dish.category.name,
          quantity: existingWastage ? existingWastage.quantity : 0,
          measurement: existingWastage ? existingWastage.measurement : 'kg',
        };
      });

      setValue('wastages', transformData);
    }
  }, [subEvent, wastagesData, setValue]);

  const onSubmit = async (data: FormValues): Promise<void> => {
    const dishWastage = data.wastages.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
    }));

    await bulkAddDishWastage({
      subeventId: data.subeventId,
      wastages: dishWastage,
    });
  };

  return (
    <div className="mt-2.5 rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
      <div
        className="flex cursor-pointer flex-row justify-between"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h2 className="text-gray-800 text-xl font-bold dark:text-white">
          {subEvent?.name}
        </h2>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2"
          >
            {isCollapsed ? (
              <BiChevronDown size={24} />
            ) : (
              <BiChevronUp size={24} />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div ref={tableRef} className="mt-4 overflow-x-auto">
              <table className="text-gray-500 dark:text-gray-400 w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-400 text-xm bg-gray-2 uppercase dark:bg-black">
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Dish
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Quantity (kg)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr
                      key={field.id}
                      className="dark:border-gray-700 dark:bg-gray-800 border-b bg-transparent"
                    >
                      <td className="text-gray-900 px-6 py-4 font-medium dark:text-white">
                        {field.categoryname}
                      </td>
                      <td className="px-6 py-4">{field.dishname}</td>
                      <td className="w-40 px-6 py-4">
                        <div className="flex items-center gap-2">
                          <GenericInputField
                            name={`wastages.${index}.quantity`}
                            type="number"
                            placeholder="Quantity"
                            className="w-24"
                          />
                          <span className="text-gray-500 dark:text-gray-300">
                            kg
                          </span>
                        </div>
                        <input
                          type="hidden"
                          name={`wastages.${index}.measurement`}
                          value="kg"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <GenericButton
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <FiSave /> {isSubmitting ? 'Saving...' : 'Save'}
              </GenericButton>
            </div>
          </form>
        </FormProvider>
      )}
    </div>
  );
};

export default DishWastage;
