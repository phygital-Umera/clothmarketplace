/* eslint-disable */
import React, {useState, useEffect} from 'react';
import {useSubEventContext} from '@/context/SubEventContext';
import {usePredictRawMaterials} from '@/lib/react-query/queriesAndMutations/cateror/dish';

const DishPopupShow: React.FC = () => {
  const {
    selectedDishDetails,
    dishUpdates,
    setSelectedDishDetails,
    handleSaveDishDetails,
    preparationPeople,
  } = useSubEventContext();
  console.log(useSubEventContext());

  // If no dish is selected, do not render anything.
  if (!selectedDishDetails) return null;

  // Local state for the dish data shown in the popup and for the dish kg value.
  const [updatedDish, setUpdatedDish] = useState(selectedDishDetails);
  const [popupKg, setPopupKg] = useState<number>(selectedDishDetails.kg || 0);

  // Get the prediction function from the hook.
  const {mutateAsync: predictRawMaterial} = usePredictRawMaterials();

  // When the popup opens or when dishUpdates change,
  // check if a manual update exists for this dish.
  // If yes, show that data first; if not, show the predicted/original data.
  useEffect(() => {
    const manualUpdate = dishUpdates[selectedDishDetails.dishId];
    if (manualUpdate) {
      setUpdatedDish({
        ...selectedDishDetails,
        kg: manualUpdate.kg,
        rawMaterials: manualUpdate.rawMaterials,
      });
      setPopupKg(manualUpdate.kg);
    } else {
      setUpdatedDish(selectedDishDetails);
      setPopupKg(selectedDishDetails.kg || 0);
    }
  }, [selectedDishDetails, dishUpdates]);

  // Update a raw material's quantity in the local state.
  const handleQuantityChange = (index: number, value: string) => {
    setUpdatedDish((prev: any) => {
      const updatedMaterials = [...prev.rawMaterials];
      updatedMaterials[index] = {
        ...updatedMaterials[index],
        quantity: Number(value),
      };
      return {...prev, rawMaterials: updatedMaterials};
    });
  };

  // When the dish kg input changes, update local state.
  const handlePopupKgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKg = parseFloat(e.target.value);
    setPopupKg(newKg);
    setUpdatedDish((prev: any) => ({...prev, kg: newKg}));
  };

  // Trigger prediction via a button click.
  // Here we merge the predicted data with the current manually entered kg value.
  const handlePredictDish = () => {
    console.log(popupKg);
    if (selectedDishDetails.dishId && !isNaN(popupKg)) {
      predictRawMaterial({
        dishId: selectedDishDetails.dishId,
        people: preparationPeople,
        kg: popupKg,
      })
        .then((res) => {
          console.log('Prediction data from popup:', res);
          // Merge predicted data with the current popupKg so that the manual input is preserved.
          setUpdatedDish((prev: any) => ({...res, kg: popupKg}));
        })
        .catch(console.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-75">
      <div className="max-h-[70vh] w-full max-w-3xl overflow-auto rounded bg-white p-5 shadow-lg dark:bg-boxdark-2">
        {/* Header with dish name and input for dish kg */}
        <div className="flex items-center justify-between">
          <h2 className="mb-4 text-xl font-bold">{selectedDishDetails.dish}</h2>
          <div className="flex items-center">
            <label className="mr-2 font-medium">Dish Kg:</label>
            <input
              disabled
              type="number"
              value={popupKg}
              onChange={handlePopupKgChange}
              className="w-24 rounded border border-stroke bg-transparent px-2 py-1 text-black outline-none dark:border-form-strokedark dark:bg-form-input dark:text-white"
            />
            {/* Predict button for dish prediction */}
            <button
              disabled
              onClick={handlePredictDish}
              className="ml-2 rounded bg-primary px-4 py-1 text-white"
            >
              Predict
            </button>
          </div>
        </div>
        {/* Table showing raw material data */}
        <div className="overflow-x-auto">
          <table className="mt-2 w-full">
            <thead>
              <tr className="bg-gray-200 dark:bg-boxdark-2">
                <th className="p-2">Raw Material</th>
                <th className="p-2">Quantity</th>
                <th className="p-2">Unit</th>
                <th className="p-2">Process</th>
              </tr>
            </thead>
            <tbody>
              {updatedDish.rawMaterials?.map((rm: any, index: number) => (
                <tr key={index} className="text-center">
                  <td className="p-1">{rm.rawMaterial}</td>
                  <td className="p-1">
                    <input
                      disabled
                      type="number"
                      value={
                        rm.quantity % 1 === 0
                          ? rm.quantity
                          : rm.quantity.toFixed(1)
                      }
                      onChange={(e) =>
                        handleQuantityChange(index, e.target.value)
                      }
                      className="w-full rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black dark:border-form-strokedark dark:bg-form-input dark:text-white"
                    />
                  </td>
                  <td className="p-1">{rm.unit}</td>
                  <td className="p-1">{rm.process || 'Select Process'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Buttons to close or save the popup */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setSelectedDishDetails(null)}
            className="hover:bg-gray-100 mx-1 rounded border border-graydark bg-transparent px-8 py-2 text-graydark transition duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-50 dark:border-bodydark dark:text-bodydark"
          >
            Close
          </button>
          <button
            disabled
            onClick={() => {
              handleSaveDishDetails(updatedDish);
              setSelectedDishDetails(null);
            }}
            className="hover:bg-primary-dark mx-1 rounded bg-primary px-8 py-2 text-white transition duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default DishPopupShow;
