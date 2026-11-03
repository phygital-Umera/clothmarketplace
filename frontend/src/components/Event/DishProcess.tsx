import React, {useState} from 'react';
import {BiChevronDown, BiChevronUp} from 'react-icons/bi';

interface Process {
  processId: string;
  process: {
    id: string;
    name: string;
  };
  rawMaterials: {
    id: string;
    name: string;
    unit: string;
    quantity: number;
  };
}

interface Dish {
  id: string;
  name: string;
  processes: Process[];
}

interface SubEvent {
  id: string;
  name: string;
  dishes: Dish[];
}

interface DishProcessPropTypes {
  subEvent: SubEvent;
}

const DishProcess: React.FC<DishProcessPropTypes> = ({subEvent}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  console.log('subEvent', subEvent);

  return (
    <div className="border-gray-200 dark:border-gray-700 mt-2.5 rounded-lg p-4 shadow-sm dark:bg-boxdark">
      {/* Sub Event Header */}
      <div
        className="flex cursor-pointer items-center justify-between bg-gray-2 p-4 py-2 dark:bg-meta-4"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h2 className="text-gray-700 text-xl font-semibold dark:text-white">
          {subEvent.name}
        </h2>
        <button
          type="button"
          className="text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-full p-2"
        >
          {isCollapsed ? (
            <BiChevronDown size={24} />
          ) : (
            <BiChevronUp size={24} />
          )}
        </button>
      </div>

      {/* Dish List */}
      {!isCollapsed && (
        <div className="mt-4 space-y-6">
          {subEvent.dishes.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 py-6 text-center">
              No dishes found
            </div>
          ) : (
            subEvent.dishes.map((dish) => (
              <div
                key={dish.id}
                className="border-gray-200 dark:border-gray-600 overflow-x-auto p-4"
              >
                {/* Dish Name */}
                <h3 className="text-gray-800 mb-3 text-lg font-semibold dark:text-white">
                  {dish.name}
                </h3>

                {/* Table */}
                {dish.processes && dish.processes.length > 0 ? (
                  <table className="w-full table-fixed border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="bg-gray-100 text-gray-700 dark:text-gray-200 w-1/3 border p-3 text-left font-semibold dark:bg-meta-4">
                          Raw Material
                        </th>
                        <th className="bg-gray-100 text-gray-700 dark:text-gray-200 w-1/3 border p-3 text-left font-semibold dark:bg-meta-4">
                          Quantity
                        </th>
                        <th className="bg-gray-100 text-gray-700 dark:text-gray-200 w-1/3 border p-3 text-left font-semibold dark:bg-meta-4">
                          Process
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dish.processes.map((proc) => (
                        <tr key={proc.processId} className="dark:bg-gray-800">
                          <td className="text-gray-700 dark:text-gray-200 border p-3">
                            {proc.rawMaterials.name}
                          </td>
                          <td className="text-gray-700 dark:text-gray-200 border p-3">
                            {proc.rawMaterials.quantity
                              ? `${proc.rawMaterials.quantity}`
                              : 'N/A'}
                          </td>
                          <td className="text-gray-700 dark:text-gray-200 border p-3">
                            {proc.process.name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">
                    No processes for this dish.
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DishProcess;
