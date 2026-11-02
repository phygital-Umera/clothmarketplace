/* eslint-disable */
import React from 'react';
import {useFormContext} from 'react-hook-form';
import Multiselect from 'multiselect-react-dropdown';

type DishSelectionProps = {
  categoryId: string;
  categoryName: string;
  dishes: {id: number; name: string}[];
};

const DishSelection: React.FC<DishSelectionProps> = ({
  categoryId,
  categoryName,
  dishes,
}) => {
  const {setValue, watch} = useFormContext();

  return (
    <tr className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
      <td className="px-4 py-4 text-center">{categoryName}</td>
      <td className="px-4 py-4">
        <Multiselect
          options={dishes.map((dish) => ({
            name: dish.name,
            id: dish.id,
          }))}
          selectedValues={watch(`category_${categoryId}_dishes`)}
          onSelect={(selectedList) => {
            setValue(
              `category_${categoryId}_dishes`,
              selectedList.map((item: any) => item.id),
            );
          }}
          onRemove={(selectedList) => {
            setValue(
              `category_${categoryId}_dishes`,
              selectedList.map((item: any) => item.id),
            );
          }}
          displayValue="name"
          placeholder="Select Dishes"
          avoidHighlightFirstOption
          isObject
        />
      </td>
    </tr>
  );
};

export default DishSelection;
