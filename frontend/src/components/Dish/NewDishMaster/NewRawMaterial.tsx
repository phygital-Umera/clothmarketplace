import {
  useGetDishById,
  useGetRawMaterialsCateror,
  useAddRawMaterialToDishCateror,
  useUpdateDishRawMaterialCateror,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {useGetProcesses} from '@/lib/react-query/queriesAndMutations/cateror/process';
import {usePredictRawMaterials} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import React, {useEffect, useState} from 'react';
// import toast from 'react-hot-toast';
import {FaEdit} from 'react-icons/fa';
import {TbTrash} from 'react-icons/tb';
import SearchableDropdown from '../CustomDropdown/SearchableDropdown';
import {WithoutPredictRawmterialForDish} from '@/lib/api/cateror/dish';
import {useRef} from 'react';
import toast from 'react-hot-toast';

interface RawMaterialRow {
  id: number;
  rawMaterial: string;
  quantity: string;
  process: string;
  unit?: string;
}

interface CardData {
  id: number;
  people: string;
  kg: string;
  price: string;
}

const NewRawMaterial = ({dishId}: {dishId: string}) => {
  const [cards, setCards] = useState<CardData[]>([]); // For storing card data
  const scrollRef = useRef<HTMLDivElement>(null);

  const [cardData, setCardData] = useState({
    people: '',
    kg: '',
    price: '',
  });
  const [dishrecords, setDishRecords] = useState([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterialRow[]>([
    {id: Date.now(), rawMaterial: '', quantity: '', process: ''},
  ]); // For storing raw material rows
  const [isupdateMode, setIsUpdateMode] = useState(false);

  // Fetch processes and raw materials for dropdowns
  const {data: processesData} = useGetProcesses();
  const processOptions = processesData?.data.processes?.map(
    (process: {id: string; name: string}) => ({
      value: process.id,
      label: process.name,
    }),
  );

  const {data: rawMaterialData} = useGetRawMaterialsCateror();

  const rawmaterialOptions = rawMaterialData?.data.rawMaterials?.map(
    (material: {id: string; name: string; unit: string}) => ({
      value: material.id,
      label: material.name,
      unit: material.unit,
    }),
  );

  // Fetch dish data based on dishId
  const {data: dishData, refetch} = useGetDishById(dishId);
  // console.log('Dish Dataaa:', dishData);

  // Handles clicking edit (copies data to first card)
  const handleEdit = (card: {
    people: string;
    dishKg: string;
    dishPrice: string;
  }) => {
    setCardData({
      people: card.people,
      kg: card.dishKg,
      price: card.dishPrice,
    });
    setIsUpdateMode(true);
    scrollRef.current?.scrollTo({left: 0, behavior: 'smooth'});
  };

  // Handles raw material row addition
  const handleAddRow = () => {
    setRawMaterials([
      ...rawMaterials,
      {id: Date.now(), rawMaterial: '', quantity: '', process: ''},
    ]);
  };

  // Handles raw material row deletion (ensuring at least one row remains)
  const handleDeleteRow = (id: number) => {
    if (rawMaterials.length > 1) {
      setRawMaterials(rawMaterials.filter((row) => row.id !== id));
    }
  };

  const {
    mutateAsync: addRawMaterial,
    isSuccess,
    isError,
  } = useAddRawMaterialToDishCateror();

  const {
    mutateAsync: updateRawMaterial,
    isSuccess: isUpdateSuccess,
    isError: isUpdateError,
  } = useUpdateDishRawMaterialCateror();

  const {
    mutateAsync: predictRawMaterial,
    isPending,
    data: PredictedRawMaterials,
  } = usePredictRawMaterials();

  useEffect(() => {
    predictRawMaterial({
      dishId,
      people: Number(cardData.people) || 0,
      kg: Number(cardData.kg) || 0,
      price: Number(cardData.price) || 0,
    });
  }, [cardData, dishId, predictRawMaterial]);

  useEffect(() => {
    if (!isupdateMode) {
      if (PredictedRawMaterials?.rawMaterials?.length) {
        const predictedRows = PredictedRawMaterials.rawMaterials.map(
          (
            material: {
              rawMaterialId: string;
              quantity: number;
              unit: string;
              processId: string;
            },
            index: number,
          ) => ({
            id: Date.now() + index, // Unique ID
            rawMaterial: material?.rawMaterialId || '', // This should match the dropdown option's value
            quantity: material?.quantity ? material.quantity.toString() : '',
            process: material?.processId || '', // This should match the process dropdown option's value
            unit: material?.unit || '',
          }),
        );
        setRawMaterials(predictedRows);
        console.log('Predicted ');
      }
    }
    if (isupdateMode) {
      WithoutPredictRawmterialForDish(dishId, Number(cardData.people) || 0)
        .then((response) => {
          const unpredicted = response.rawMaterials.map(
            (
              material: {
                rawMaterialId: string;
                quantity: number;
                unit: string;
                processId: string;
              },
              index: number,
            ) => ({
              id: Date.now() + index, // Unique ID
              rawMaterial: material.rawMaterialId, // This should match the dropdown option's value
              quantity: material.quantity.toString(),
              process: material.processId, // This should match the process dropdown option's value
              unit: material.unit,
            }),
          );
          setRawMaterials(unpredicted);
          console.log('Not Predicted ');
        })
        .catch((error) => {
          console.error('Error fetching raw materials:', error);
        });
    }
  }, [PredictedRawMaterials]);

  // Handle form submission
  const handleSubmit = () => {
    // Format data to submit
    const formattedData = {
      dishId,
      rawMaterials: rawMaterials.map((row) => ({
        rawMaterialId: row.rawMaterial,
        quantity: row.quantity,
        processId: row.process,
      })),
      people: Number(cardData.people) || 0,
      price: Number(cardData.price) || 0,
      kg: Number(cardData.kg) || 0,
    };
    isupdateMode
      ? updateRawMaterial(formattedData)
      : addRawMaterial(formattedData);
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success('Raw material added successfully');
      // setCardData({people: '', kg: '', price: ''});
    }
    if (isError) {
      // toast.error('Failed to add raw material. Please try again.');
    }
  }, [isSuccess, isError]);

  useEffect(() => {
    if (isUpdateSuccess) {
      toast.success('Raw material updated successfully');
      setCardData({people: '', kg: '', price: ''});
      setIsUpdateMode(false);
    }
    if (isUpdateError) {
      toast.error('Failed to update raw material. Please try again.');
    }
  }, [isUpdateSuccess, isUpdateError]);

  useEffect(() => {
    if (dishData) {
      setDishRecords(dishData.data.records);
    }
  }, [isSuccess, dishData]);
  // Reset component state when dishId changes
  useEffect(() => {
    refetch(); // Refetch data when dishId changes
  }, [dishId, isSuccess, refetch, isUpdateSuccess]); // Runs when dishId changes

  return (
    dishId && (
      <div className="my-4 bg-white p-6 dark:bg-black">
        <h1 className="mb-6 text-2xl font-semibold">
          {dishData?.data?.name || 'Dish Name'}
        </h1>

        {/* Cards Section */}
        <div
          ref={scrollRef}
          className="flex justify-start gap-4 overflow-x-auto scroll-smooth"
        >
          {/* First Card (For Adding/Editing) */}
          <div className="w-60 shrink-0 rounded-lg border-2 border-blue-200 p-4 shadow-sm dark:border-primary">
            <input
              placeholder="People"
              className="mb-2 w-48 rounded border-[1.7px] border-blue-200 bg-transparent px-5 py-3 text-black outline-none ring-1 ring-yellow-500 transition focus:border-primary dark:border-primary dark:bg-form-input dark:text-white dark:focus:border-primary"
              value={cardData.people || ''}
              onChange={(e) =>
                setCardData((prev) => ({...prev, people: e.target.value}))
              }
            />
            <input
              placeholder="Kg"
              className="mb-2 w-48 rounded border-[1.7px] border-blue-200 bg-transparent px-5 py-3 text-black outline-none ring-1 ring-yellow-500 transition focus:border-primary dark:border-primary dark:bg-form-input dark:text-white dark:focus:border-primary"
              value={cardData.kg || ''}
              onChange={(e) =>
                setCardData((prev) => ({...prev, kg: e.target.value}))
              }
            />
            {/* <input
              placeholder="Price"
              className="mb-2 w-48 rounded border-[1.7px] border-blue-200 bg-transparent px-5 py-3 text-black outline-none ring-1 ring-yellow-500 transition focus:border-primary dark:border-primary dark:bg-form-input dark:text-white dark:focus:border-primary"
              value={cardData.price || ''}
              onChange={(e) =>
                setCardData((prev) => ({...prev, price: e.target.value}))
              }
            /> */}
          </div>

          {/* Existing Cards (Readonly) - Sorted in Ascending Order by People */}
          {dishrecords
            ?.slice() // Create a shallow copy to avoid mutating the original array
            .sort((a, b) => a.people - b.people) // Sort by 'people' in ascending order
            .map((card) => (
              <div
                key={card.id || `${card.people}-${card.dishKg}`} // Use a unique key (id might not exist, so fallback to a composite key)
                className="w-48 shrink-0 rounded-lg border p-4 shadow-sm"
              >
                <input
                  type="number"
                  value={card.people}
                  className="mb-2 w-32 rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  readOnly
                />
                <input
                  type="number"
                  value={card.dishKg}
                  className="mb-2 w-32 rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  readOnly
                />
                {/* <input
                  type="number"
                  value={card.dishPrice}
                  className="mb-2 w-32 rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  readOnly
                /> */}
                <button
                  className="bg-gray-200 w-full rounded-md p-2"
                  onClick={() => handleEdit(card)}
                >
                  ✏️
                </button>
              </div>
            ))}
        </div>

        {/* Raw Material Rows */}
        <div className="mt-6 flex flex-col gap-4">
          <h1 className="mt-10 text-xl">Raw Materials</h1>
          <div className="w-full overflow-x-auto scroll-smooth">
            <div className="mb-50 mt-10 w-max min-w-full">
              {rawMaterials
                ?.slice() // Create a shallow copy to avoid mutating the original array
                .sort((a, b) => {
                  // Get the raw material names from rawmaterialOptions based on their IDs
                  const rawMaterialA =
                    rawmaterialOptions?.find(
                      (opt) => opt.value === a.rawMaterial,
                    )?.label || '';
                  const rawMaterialB =
                    rawmaterialOptions?.find(
                      (opt) => opt.value === b.rawMaterial,
                    )?.label || '';
                  return rawMaterialA.localeCompare(rawMaterialB); // Sort alphabetically
                })
                .map((row) => (
                  <div key={row.id} className="flex min-w-[600px] gap-4">
                    {/* Raw Material Dropdown */}
                    <SearchableDropdown
                      options={rawmaterialOptions || []}
                      value={row.rawMaterial}
                      onChange={(value) => {
                        const selectedRawMaterial = rawmaterialOptions.find(
                          (option) => option.value === value,
                        );
                        setRawMaterials((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? {
                                  ...item,
                                  rawMaterial: value,
                                  unit: selectedRawMaterial?.unit || '',
                                }
                              : item,
                          ),
                        );
                      }}
                      placeholder="Select Raw Material"
                    />

                    {/* Quantity Input */}
                    <div className="relative w-full">
                      <input
                        type="number"
                        placeholder="Quantity"
                        className="mb-2 w-full rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        value={parseFloat(parseFloat(row.quantity).toFixed(2))}
                        onChange={(e) =>
                          setRawMaterials((prev) =>
                            prev?.map((item) =>
                              item.id === row.id
                                ? {...item, quantity: e.target.value}
                                : item,
                            ),
                          )
                        }
                      />
                      {row.unit && (
                        <span className="text-gray-500 pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          {row.unit}
                        </span>
                      )}
                    </div>

                    {/* Process Dropdown */}
                    <SearchableDropdown
                      options={processOptions || []}
                      value={row.process}
                      onChange={(value) =>
                        setRawMaterials((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? {...item, process: value}
                              : item,
                          ),
                        )
                      }
                      placeholder="Select Process"
                    />

                    {/* Add Row Button */}
                    <button onClick={handleAddRow}>
                      <div className="flex items-center justify-between rounded bg-primary px-4 py-2 text-lg text-white">
                        <FaEdit />
                        Add
                      </div>
                    </button>

                    {/* Delete Row Button */}
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      disabled={rawMaterials.length === 1}
                    >
                      <div className="flex items-center justify-between rounded bg-primary px-4 py-2 text-lg text-white">
                        <TbTrash />
                        Delete
                      </div>
                    </button>
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              className="rounded bg-primary px-8 py-3 text-white"
              onClick={handleSubmit}
            >
              {isPending ? 'Update....' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    )
  );
};

export default NewRawMaterial;
