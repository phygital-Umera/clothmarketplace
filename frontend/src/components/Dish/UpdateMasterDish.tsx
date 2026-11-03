import React, {useEffect, useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';

import {
  useGetDishesAdmin,
  useGetRawMaterialAdmin,
  useGetDishByIdAdmin,
} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {addRawMaterialToDishSchema} from '@/lib/validation/dishSchemas';
import GenericInputField from '../Forms/Input/GenericInputField';
import {FaEdit} from 'react-icons/fa';
import {useDishMaster} from '@/context/DishMasterContext';

const DishUpdateSchema = z.object({
  name: z.string(), // Dish name (required)
  people: z.string(), // Number of people (required)
  kg: z.string(), // Weight in KG (required)
  price: z.string(), // Price (required)
  rawMaterial: z.string(), // Raw Material selection (required)
  quantity: z.string(), // Quantity of raw material (required)
  process: z.string(), // Process (required)
});

type FormValues = z.infer<typeof DishUpdateSchema> &
  z.infer<typeof addRawMaterialToDishSchema>;

interface CardData {
  people: string;
  kg: string;
  price: string;
}

const UpdateMasterDish: React.FC = () => {
  const {dishId} = useDishMaster();
  const methods = useForm<FormValues>({
    resolver: zodResolver(DishUpdateSchema),
    defaultValues: {
      name: '',
      rawMaterial: '',
      quantity: '',
      process: '',
    },
  });

  const {watch, setValue} = methods;
  const selectedDishId = watch('name'); // Watching the 'name' field (selected dish)

  const {data: DishData} = useGetDishesAdmin(dishId);
  const formattedDishDropdownData = DishData?.data.data.map(
    (dish: {id: string; name: string}) => ({
      label: dish.name,
      value: dish.id,
    }),
  );

  const {data: dishData, isLoading: isDishLoading} =
    useGetDishByIdAdmin(selectedDishId);
  console.log(' selectedDish Data : ', dishData);

  const [formattedDishData, setFormattedDishData] = useState<CardData[]>([]);

  const [selectedPeople, setSelectedPeople] = useState<number>(0);

  const {data: dishRawMaterialData} = useGetRawMaterialAdmin(
    selectedDishId,
    selectedPeople,
  );
  console.log(' selected data: ', dishRawMaterialData);

  const mappedData = dishRawMaterialData?.data?.map(
    (item: {
      rawMaterialId: string;
      rawMaterial: {name: string};
      quantity: number;
      processId: string;
      process: {name: string};
    }) => ({
      rawMaterialId: item.rawMaterialId,
      rawMaterialName: item.rawMaterial.name,
      quantity: item.quantity,
      processId: item.processId,
      process: item.process.name,
    }),
  );

  useEffect(() => {
    if (
      selectedDishId &&
      !isDishLoading &&
      dishData?.data.caterorDishRawMaterialQuantities
    ) {
      const formattedData = dishData.data.caterorDishRawMaterialQuantities.map(
        (item: {people: string; dishKg: string; dishPrice: string}) => ({
          people: item.people,
          kg: item.dishKg,
          price: item.dishPrice,
        }),
      );
      setFormattedDishData(formattedData); // Update the formatted dish data state
    }
  }, [selectedDishId, dishData, isDishLoading]);

  const handleEdit = async (dish: CardData) => {
    setValue('people', dish.people); // Set 'people' field in form
    setValue('kg', dish.kg); // Set 'kg' field in form
    setValue('price', dish.price); // Set 'price' field in form
    setSelectedPeople(parseInt(dish.people)); // Set the selected people count
  };

  const onSubmit = async (data: FormValues) => {
    console.log('Form submitted:', data);
  };
  return (
    <div className="space-y-8 bg-white p-8 dark:bg-black">
      {/* Form to select a dish */}
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
            <h1 className="col-span-12 mb-4 text-lg font-semibold">
              Display Dish
            </h1>
            <div className="col-span-12 md:col-span-6">
              {/* Dish selection dropdown */}
              <GenericSearchDropdown
                name="name"
                label="Select Dish"
                // options={DishData?.data.dishes || []}
                options={formattedDishDropdownData || []} // Passing options to the dropdown
              />
            </div>
          </div>
        </form>
      </FormProvider>

      {/* Dish details input fields (People, KG, Price) */}
      <FormProvider {...methods}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <div className="col-span-2 flex flex-col md:col-span-1">
            <GenericInputField name="people" label="People" />
            <GenericInputField name="kg" label="KG" />
            <GenericInputField name="price" label="Price" />
          </div>

          {/* Card Section to display the selected dish data */}
          <div className="col-span-2 grid grid-cols-1 gap-4 md:col-span-3 md:grid-cols-3">
            {formattedDishData.map((dish, index) => (
              <div key={index} className="rounded-lg">
                <div className="mb-2">
                  <label className="mb-4 block text-sm font-semibold">
                    People
                  </label>
                  <input
                    name={`dishPeople.${index}`}
                    value={dish.people}
                    readOnly
                    className="w-full rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>

                <div className="mb-2">
                  <label className="mb-1 block text-sm font-semibold">KG</label>
                  <input
                    name={`dishKg.${index}`}
                    value={dish.kg}
                    readOnly
                    className="w-full rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>

                <div className="mb-2">
                  <label className="mb-1 block text-sm font-semibold">
                    Price
                  </label>
                  <input
                    name={`dishPrice.${index}`}
                    value={dish.price}
                    readOnly
                    className="w-full rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => handleEdit(dish)}
                    className="grid w-full place-items-center py-2"
                  >
                    <FaEdit className="text-xl" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FormProvider>

      {/* Raw Material and Process Section */}
      <FormProvider {...methods}>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Raw Materials</h2>
          {mappedData && mappedData.length > 0 ? (
            <div className="space-y-2">
              {mappedData.map(
                (
                  item: {
                    rawMaterialId: string;
                    rawMaterialName: string;
                    quantity: number;
                    processId: string;
                    process: string;
                  },
                  index: number,
                ) => (
                  <div
                    key={index}
                    className="bg-gray-50 flex flex-wrap gap-4 rounded-lg"
                  >
                    {/* Raw Material */}
                    <div className="min-w-[150px] flex-1">
                      <label className="block text-sm font-semibold">
                        Raw Material
                      </label>
                      <select
                        name={`rawMaterialName.${index}`}
                        value={item.rawMaterialId}
                        disabled
                        className="disabled:bg-gray-100 w-full rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-not-allowed dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      >
                        <option value={item.rawMaterialId}>
                          {item.rawMaterialName}
                        </option>
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="min-w-[100px] flex-1">
                      <label className="block text-sm font-semibold">
                        Quantity
                      </label>
                      <input
                        name={`quantity.${index}`}
                        value={item.quantity}
                        readOnly
                        className="disabled:bg-gray-100 w-full rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-not-allowed dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                    </div>

                    {/* Process */}
                    <div className="min-w-[150px] flex-1">
                      <label className="block text-sm font-semibold">
                        Process
                      </label>
                      <select
                        name={`process.${index}`}
                        value={item.processId}
                        disabled
                        className="disabled:bg-gray-100 w-full rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-not-allowed dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      >
                        <option value={item.processId}>{item.process}</option>
                      </select>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center">
              No raw materials found for the selected dish.
            </p>
          )}
        </div>
      </FormProvider>
    </div>
  );
};

export default UpdateMasterDish;
