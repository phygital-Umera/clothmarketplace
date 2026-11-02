import React, {useState, useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {useGetRawMaterialAdmin} from '@/lib/react-query/queriesAndMutations/admin/dish';

const RawMaterialTable: React.FC<{languageId: string}> = ({languageId}) => {
  const {handleSubmit} = useForm();
  const [tableData, setTableData] = useState<
    {
      id: string;
      name: string;
      people: number;
      quantity: number;
      price: number;
    }[]
  >([]);
  const [rawMaterialOptions, setRawMaterialOptions] = useState<
    {label: string; value: string}[]
  >([]);

  const {data: rawMaterialData, refetch} = useGetRawMaterialAdmin(languageId);

  // Fetch raw materials based on language
  useEffect(() => {
    if (languageId) refetch();
  }, [languageId, refetch]);

  useEffect(() => {
    if (rawMaterialData?.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options = rawMaterialData.data.map((item: any) => ({
        label: item.name,
        value: item.id,
      }));
      setRawMaterialOptions(options);
    }
  }, [rawMaterialData]);

  // Add a new row
  const addNewRow = () => {
    setTableData((prev) => [
      ...prev,
      {id: '', name: '', people: 0, quantity: 0, price: 0},
    ]);
  };

  // Handle input change in the table
  const handleInputChange = (
    index: number,
    key: keyof (typeof tableData)[number], // Ensures `key` is a valid key
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
  ) => {
    const updatedTable = [...tableData];
    updatedTable[index][key] = value; // TypeScript now understands that `key` is valid
    setTableData(updatedTable);
  };

  // Submit form data
  const onSubmit = () => {
    console.log('Submitted Data:', tableData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4">
      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="border-gray-200 min-w-full border-collapse border">
          <thead>
            <tr>
              <th className="border-gray-200 border px-4 py-2">Raw Material</th>
              <th className="border-gray-200 border px-4 py-2">People</th>
              <th className="border-gray-200 border px-4 py-2">
                Dish Quantity
              </th>
              <th className="border-gray-200 border px-4 py-2">Price</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={index}>
                {/* Raw Material Dropdown */}
                <td className="border-gray-200 border px-4 py-2">
                  <select
                    className="w-full rounded border px-2 py-1"
                    value={row.id}
                    onChange={(e) =>
                      handleInputChange(index, 'id', e.target.value)
                    }
                  >
                    <option value="" disabled>
                      Select Raw Material
                    </option>
                    {rawMaterialOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                {/* People Input */}
                <td className="border-gray-200 border px-4 py-2">
                  <input
                    type="number"
                    className="w-full rounded border px-2 py-1"
                    value={row.people}
                    onChange={(e) =>
                      handleInputChange(index, 'people', Number(e.target.value))
                    }
                  />
                </td>
                {/* Dish Quantity Input */}
                <td className="border-gray-200 border px-4 py-2">
                  <input
                    type="number"
                    className="w-full rounded border px-2 py-1"
                    value={row.quantity}
                    onChange={(e) =>
                      handleInputChange(
                        index,
                        'quantity',
                        Number(e.target.value),
                      )
                    }
                  />
                </td>
                {/* Price Input */}
                <td className="border-gray-200 border px-4 py-2">
                  <input
                    type="number"
                    className="w-full rounded border px-2 py-1"
                    value={row.price}
                    onChange={(e) =>
                      handleInputChange(index, 'price', Number(e.target.value))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add New and Submit Buttons */}
      <div className="mt-4 flex justify-end space-x-4">
        <button
          type="button"
          onClick={addNewRow}
          className="rounded bg-blue-500 px-4 py-2 text-white"
        >
          Add New
        </button>
        <button
          type="submit"
          className="rounded bg-green-500 px-4 py-2 text-white"
        >
          Save
        </button>
      </div>
    </form>
  );
};

export default RawMaterialTable;
