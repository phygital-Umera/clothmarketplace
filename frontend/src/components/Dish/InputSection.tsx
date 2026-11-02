import React, {useState, useEffect} from 'react';
import {FiEdit, FiTrash} from 'react-icons/fi';
import GenericButton from '../Forms/Buttons/GenericButton';
import {useDishMaster} from '@/context/DishMasterContext';
import {usePredictRawMaterials} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useForm, Controller} from 'react-hook-form';

interface Column {
  people: string;
  kg: string;
  price: string;
}

const InputSection: React.FC = () => {
  const {setInputData, dishId} = useDishMaster();
  const [peopleColumns, setPeopleColumns] = useState<string[]>([]); // Store People data in columns
  const [kgColumns, setKgColumns] = useState<string[]>([]); // Store Kg data in columns
  const [priceColumns, setPriceColumns] = useState<string[]>([]); // Store Price data in columns
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Initialize react-hook-form
  const {control, handleSubmit, reset, setValue, getValues} = useForm<Column>({
    defaultValues: {
      people: '',
      kg: '',
      price: '',
    },
  });

  const {mutate: predictRawMaterials} = usePredictRawMaterials();

  // Trigger prediction based on form values change
  useEffect(() => {
    const {people, kg, price} = getValues(); // Fetch current form values
    if (people && kg && price) {
      predictRawMaterials(
        {dishId, people: Number(people), price: Number(price), kg: Number(kg)},
        {
          onSuccess: (data) => {
            setInputData({...data});
          },
        },
      );
    }
  }, [dishId, predictRawMaterials, setInputData, getValues]); // Removed getValues from dependencies

  const onSubmit = (data: Column) => {
    if (editingIndex !== null) {
      // Update existing column
      setPeopleColumns((prev) => {
        const updatedPeople = [...prev];
        updatedPeople[editingIndex] = data.people;
        return updatedPeople;
      });
      setKgColumns((prev) => {
        const updatedKg = [...prev];
        updatedKg[editingIndex] = data.kg;
        return updatedKg;
      });
      setPriceColumns((prev) => {
        const updatedPrice = [...prev];
        updatedPrice[editingIndex] = data.price;
        return updatedPrice;
      });
      setEditingIndex(null);
    } else {
      // Add new entry to each column (People, Kg, Price)
      setPeopleColumns((prev) => [...prev, data.people]);
      setKgColumns((prev) => [...prev, data.kg]);
      setPriceColumns((prev) => [...prev, data.price]);
    }

    // Reset form after save or update
    reset({
      people: '',
      kg: '',
      price: '',
    });
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setValue('people', peopleColumns[index]);
    setValue('kg', kgColumns[index]);
    setValue('price', priceColumns[index]);
  };

  const handleDelete = (index: number) => {
    setPeopleColumns(peopleColumns.filter((_, i) => i !== index));
    setKgColumns(kgColumns.filter((_, i) => i !== index));
    setPriceColumns(priceColumns.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-gray-100 h-auto p-6">
      <div className="flex max-w-full flex-col gap-6 md:flex-row">
        {/* Input Section */}
        <div className="mb-4 flex w-full max-w-md flex-col space-y-4 rounded bg-white p-6 dark:bg-form-input md:w-1/3">
          <div className="flex flex-col gap-2">
            <label className="text-gray-700 text-sm font-medium dark:text-white">
              People
            </label>
            <Controller
              name="people"
              control={control}
              render={({field}) => (
                <input
                  {...field}
                  type="text"
                  placeholder="Enter number of people"
                  className="w-50 rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-gray-700 text-sm font-medium dark:text-white">
              Kg
            </label>
            <Controller
              name="kg"
              control={control}
              render={({field}) => (
                <input
                  {...field}
                  type="text"
                  placeholder="Enter weight in kg"
                  className="w-50 rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-gray-700 text-sm font-medium dark:text-white">
              Price
            </label>
            <Controller
              name="price"
              control={control}
              render={({field}) => (
                <input
                  {...field}
                  type="text"
                  placeholder="Enter price"
                  className="w-50 rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              )}
            />
          </div>

          <GenericButton
            onClick={handleSubmit(onSubmit)}
            className={`w-32 p-3 ${editingIndex == null ? 'block' : 'hidden'}`}
          >
            Save
          </GenericButton>

          <GenericButton
            onClick={handleSubmit(onSubmit)}
            className={`w-32 p-3 ${editingIndex !== null ? 'block' : 'hidden'}`}
          >
            Update
          </GenericButton>
        </div>

        {/* Vertical Table Section */}
        <div className="flex max-w-full overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th className="text-gray-700 px-4 py-2 text-left font-semibold dark:text-white">
                  Field
                </th>
                {peopleColumns.map((_, index) => (
                  <th
                    key={index}
                    className="text-gray-700 px-4 py-2 text-left font-semibold dark:text-white"
                  >
                    Entry {index + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Display the 'People' data in the first row */}
              <tr className="border-gray-300 border-t dark:border-form-strokedark">
                <td className="text-gray-700 px-4 py-2 dark:text-white">
                  People
                </td>
                {peopleColumns.map((entry, index) => (
                  <td
                    key={index}
                    className="text-gray-700 px-4 py-2 dark:text-white"
                  >
                    {entry}
                  </td>
                ))}
              </tr>

              {/* Display the 'Kg' data in the second row */}
              <tr className="border-gray-300 border-t dark:border-form-strokedark">
                <td className="text-gray-700 px-4 py-2 dark:text-white">Kg</td>
                {kgColumns.map((entry, index) => (
                  <td
                    key={index}
                    className="text-gray-700 px-4 py-2 dark:text-white"
                  >
                    {entry}
                  </td>
                ))}
              </tr>

              {/* Display the 'Price' data in the third row */}
              <tr className="border-gray-300 border-t dark:border-form-strokedark">
                <td className="text-gray-700 px-4 py-2 dark:text-white">
                  Price
                </td>
                {priceColumns.map((entry, index) => (
                  <td
                    key={index}
                    className="text-gray-700 px-4 py-2 dark:text-white"
                  >
                    {entry}
                  </td>
                ))}
              </tr>

              {/* Actions Row for Editing and Deleting */}
              {peopleColumns.length > 0 && (
                <tr className="border-gray-300 border-t dark:border-form-strokedark">
                  <td className="text-gray-700 px-4 py-2 dark:text-white">
                    Actions
                  </td>
                  {peopleColumns.map((_, index) => (
                    <td key={index} className="px-4 py-2">
                      <button
                        onClick={() => handleEdit(index)}
                        className="text-blue-500 dark:text-blue-300"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="ml-2 text-red-500 dark:text-red-300"
                      >
                        <FiTrash />
                      </button>
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InputSection;
