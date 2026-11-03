/* eslint-disable */
import GenericInputField from '@/components/Forms/Input/GenericInputField';
import GenericSearchDropdown from '@/components/Forms/SearchDropDown/GenericSearchDropdown';
import GenericSimpleDrpdown from '@/components/Forms/SearchDropDown/GenericSimpleDrpdown';
import {useSubEventContext} from '@/context/SubEventContext';
import React from 'react';

interface DishRowProps {
  index: number;
  field: any;
  register: any;
  getValues: any;
  DishCategories: any;
  CaterorDish: any;
  maharajOptions: any;
}

const DishRow: React.FC<DishRowProps> = ({
  index,
  field,
  register,
  getValues,
  DishCategories,
  CaterorDish,
  maharajOptions,
}) => {
  const {
    onDishClick,
    predictRawMaterial,
    preparationPeople,
    setPredictedRawMaterials,
    setSelectedDishDetails,
  } = useSubEventContext();

  // Sort dishes alphabetically by name
  const sortedDishes = [...(CaterorDish?.data.dishes || [])].sort((a, b) =>
    a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}),
  );

  // Get the selected dish based on dishId
  const selectedDish = sortedDishes.find(
    (item: {id: string}) => item.id === field?.dishId,
  );

  // Find dish category name
  const dishCategoryName =
    DishCategories?.data.categories?.find(
      (category: {id: string; name: string}) =>
        category.id === selectedDish?.categoryId,
    )?.name || '';

  // Check if dish has no raw materials
  const isMissingRawMaterial =
    selectedDish?.caterorDishRawMaterialQuantities?.length === 0;

  // For the kg input, merge the react-hook-form onChange with our custom handler.
  const {onChange: onKgChange, ...kgRegisterRest} = register(
    `dishes.${index}.kg`,
  );

  // Update only the form state.
  const handleKgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onKgChange(e);
  };

  return (
    <tr>
      <td className="px-4">
        <input
          type="text"
          className="w-full border-none bg-transparent text-black dark:text-white"
          disabled
          value={dishCategoryName}
        />
      </td>
      <td className="px-4">
        <input
          type="text"
          value={selectedDish?.name || ''}
          className={`w-full cursor-pointer border-none bg-transparent text-black dark:text-white ${
            isMissingRawMaterial ? 'text-red-500 dark:text-red-500' : ''
          }`}
          onClick={() => onDishClick(getValues(`dishes.${index}.dishId`))}
          readOnly
        />
      </td>
      <td className="px-4">
        <GenericSimpleDrpdown
          name={`dishes.${index}.maharajId`}
          options={maharajOptions}
        />
      </td>
      <td className="flex items-center px-4 py-2">
        <input
          type="text"
          value={getValues(`dishes.${index}.kg`)}
          className="w-full border-none bg-transparent pt-4 text-black dark:text-white"
          disabled
        />
      </td>
    </tr>
  );
};

export default DishRow;
