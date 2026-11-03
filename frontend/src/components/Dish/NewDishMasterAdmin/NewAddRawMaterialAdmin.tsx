import {
  useGetDishByIdAdmin,
  useAddRawMaterialsToDish,
  useGetRawMaterialAdmin,
  useUpdateRawMaterilasToDish,
} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useGetProcesses} from '@/lib/react-query/queriesAndMutations/admin/process';
import {usePredictRawMaterials} from '@/lib/react-query/queriesAndMutations/admin/dish';
import React, {useEffect, useState} from 'react';
// import toast from 'react-hot-toast';
import {FaEdit} from 'react-icons/fa';
import {TbTrash} from 'react-icons/tb';
import {withoutPrediction} from '@/lib/api/admin/dish';
import SearchableDropdown from '../CustomDropdown/SearchableDropdown';

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

const NewAddRawMaterialAdmin = ({
  dishId,
  languageId,
}: {
  dishId: string;
  languageId: string;
}) => {
  const [cards, setCards] = useState<CardData[]>([]); // For storing card data
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

  const processOptions = processesData?.processes?.map(
    (process: {id: string; name: string}) => ({
      value: process.id,
      label: process.name,
    }),
  );

  const {data: rawMaterialData, refetch: RawmaterialRefetch} =
    useGetRawMaterialAdmin(languageId);

  useEffect(() => {
    RawmaterialRefetch();
  }, [languageId]);

  const rawmaterialOptions = rawMaterialData?.data?.map(
    (material: {id: string; name: string}) => ({
      value: material.id,
      label: material.name,
    }),
  );

  // Fetch dish data based on dishId
  const {data: dishData, refetch} = useGetDishByIdAdmin(dishId);

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
  } = useAddRawMaterialsToDish();

  const {
    mutateAsync: updateRawMaterial,
    isSuccess: isUpdateSuccess,
    isError: isUpdateError,
  } = useUpdateRawMaterilasToDish();

  const {mutateAsync: predictRawMaterial, data: PredictedRawMaterials} =
    usePredictRawMaterials();

  useEffect(() => {
    predictRawMaterial({
      dishId,
      people: Number(cardData.people) || 0,
      kg: Number(cardData.kg) || 0,
      price: Number(cardData.price) || 0,
    });
  }, [cardData]);

  useEffect(() => {
    if (!isupdateMode) {
      if (PredictedRawMaterials?.rawMaterials?.length) {
        const predictedRows = PredictedRawMaterials.rawMaterials.map(
          (
            material: {
              rawMaterialId: string;
              quantity: number;
              processId: string;
              unit: string;
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

        setRawMaterials(predictedRows);
        console.log(predictedRows);
      }
    }
    if (isupdateMode) {
      withoutPrediction(dishId, Number(cardData.people) || 0).then((data) => {
        const foramtteddata = data.rawMaterials.map(
          (
            material: {
              rawMaterialId: string;
              quantity: number;
              processId: string;
              unit: string;
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
        setRawMaterials(foramtteddata);
        console.log(foramtteddata);
      });
    }
  }, [PredictedRawMaterials]);

  // Handle form submission
  const handleSubmit = () => {
    const formattedData = {
      dishId: dishId,
      people: Number(cardData.people) || 0,
      price: Number(cardData.price) || 0,
      kg: Number(cardData.kg) || 0,
      rawMaterials: rawMaterials.map((row) => ({
        rawMaterialId: row.rawMaterial,
        processId: row.process,
        quantity: Number(row.quantity),
      })),
    };
    isupdateMode
      ? updateRawMaterial({
          ...formattedData,
          rawMaterialsWithQuantityAndPrice: formattedData.rawMaterials,
        })
      : addRawMaterial({
          ...formattedData,
          rawMaterialsWithQuantityAndPrice: formattedData.rawMaterials,
        });
  };

  useEffect(() => {
    if (isSuccess) {
      setCardData({people: '', kg: '', price: ''});
    }
  }, [isSuccess]);

  useEffect(() => {
    if (isUpdateSuccess) {
      // toast.success('Raw material updated successfully');
      setCardData({people: '', kg: '', price: ''});
      setIsUpdateMode(false);
    }
    if (isUpdateError) {
      // toast.error('Failed to update raw material. Please try again.');
    }
  }, [isUpdateSuccess, isUpdateError]);

  useEffect(() => {
    if (dishData) {
      setDishRecords(dishData.data.records);
    }
  }, [isSuccess, dishData, isUpdateSuccess]);
  // Reset component state when dishId changes
  useEffect(() => {
    refetch(); // Refetch data when dishId changes
  }, [dishId, isSuccess]); // Runs when dishId changes

  return (
    dishId && (
      <div className="my-4 bg-white p-6 dark:bg-black">
        <h1 className="mb-6 text-2xl font-semibold">
          {dishData?.data?.name || 'Dish Name'}
        </h1>

        {/* Cards Section */}
        <div className="flex justify-start gap-4 overflow-x-auto">
          {/* First Card (For Adding/Editing) */}
          <div className="w-60 rounded-lg border p-4 shadow-sm">
            <input
              placeholder="People"
              className="mb-2 w-48 rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              value={cardData.people || ''}
              onChange={(e) =>
                setCardData((prev) => ({...prev, people: e.target.value}))
              }
            />
            <input
              placeholder="Kg"
              className="mb-2 w-48 rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              value={cardData.kg || ''}
              onChange={(e) =>
                setCardData((prev) => ({...prev, kg: e.target.value}))
              }
            />
            <input
              placeholder="Price"
              className="mb-2 w-48 rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              value={cardData.price || ''}
              onChange={(e) =>
                setCardData((prev) => ({...prev, price: e.target.value}))
              }
            />
          </div>

          <div>
            <div className="flex justify-center gap-2 overflow-x-auto">
              {/* Existing Cards (Readonly) */}
              {dishrecords?.map(
                (card: {
                  id: number;
                  people: string;
                  dishKg: string;
                  dishPrice: string;
                }) => (
                  <div
                    key={card.id}
                    className="w-48 rounded-lg border p-4 shadow-sm"
                  >
                    <input
                      type="number"
                      value={card.people}
                      className="mb-2 w-32 rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      readOnly
                    />
                    <input
                      type="number"
                      value={card.dishKg}
                      className="mb-2 w-32 rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      readOnly
                    />
                    <input
                      type="number"
                      value={card.dishPrice}
                      className="mb-2 w-32 rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      readOnly
                    />
                    <button
                      className="bg-gray-200 w-full rounded-md p-2"
                      onClick={() => handleEdit(card)}
                    >
                      ✏️
                    </button>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Raw Material Rows */}
        <div className="mt-6 flex flex-col gap-4">
          <h1 className="text-xl">Raw Materials</h1>
          <div className="w-full overflow-x-auto">
            <div className="mb-50 mt-10 w-max min-w-full">
              {rawMaterials?.map((row) => (
                <div key={row.id} className="flex min-w-[600px] gap-4">
                  {/* Raw Material Dropdown */}
                  <SearchableDropdown
                    options={rawmaterialOptions || []}
                    value={row.rawMaterial}
                    onChange={(value) =>
                      setRawMaterials((prev) =>
                        prev.map((item) =>
                          item.id === row.id
                            ? {...item, rawMaterial: value}
                            : item,
                        ),
                      )
                    }
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
                          item.id === row.id ? {...item, process: value} : item,
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
                    disabled={rawMaterials.length === 1} // Prevents deleting the last row
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
              {isupdateMode ? 'Update' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    )
  );
};

export default NewAddRawMaterialAdmin;
