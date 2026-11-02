/* eslint-disable */
// DishTable.tsx
import React from 'react';
import DishRow from './DishRow';

interface DishTableProps {
  subEventDishes: any[];
  register: any;
  getValues: any;
  DishCategories: any;
  CaterorDish: any;
  maharajOptions: any;
}

const DishTable: React.FC<DishTableProps> = ({
  subEventDishes,
  register,
  getValues,
  DishCategories,
  CaterorDish,
  maharajOptions,
}) => {
  return (
    <div className="mt-2.5 min-h-[30vh] max-w-full overflow-x-auto">
      <table className="w-full table-auto">
        <thead>
          <tr className="bg-gray-2 text-left dark:bg-meta-4">
            {['Category', 'Dish', 'Maharaj', 'Kg'].map((column, index) => (
              <th
                key={index}
                className="min-w-[120px] px-4 py-4 font-medium text-black dark:text-white"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subEventDishes.map((field: any, index: number) => (
            <DishRow
              key={field.dishId || index}
              index={index}
              field={field}
              register={register}
              getValues={getValues}
              DishCategories={DishCategories}
              CaterorDish={CaterorDish}
              maharajOptions={maharajOptions}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DishTable;
