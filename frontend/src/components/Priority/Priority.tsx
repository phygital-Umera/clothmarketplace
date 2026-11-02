import React, {useState, useEffect} from 'react';
import GenericButton from '../Forms/Buttons/GenericButton';
import {
  useAddPriority,
  useGetAllPriorities,
  useUpdatePriority,
} from '@/lib/react-query/queriesAndMutations/cateror/priority';
import {useGetDishCategories} from '@/lib/react-query/queriesAndMutations/cateror/dish';
// import toast from 'react-hot-toast';

interface Ratio {
  ratio: string;
  value: string;
}

interface ApiData {
  id: string;
  categoryId: string;
  categoryName: string;
  ratios: Ratio[];
}

const Priority: React.FC = () => {
  const [processedData, setProcessedData] = useState<ApiData[]>([]); // Data from API
  const [newRatio, setNewRatio] = useState<string>(''); // State for ratio input
  const [newValues, setNewValues] = useState<string[]>([]); // State for input values
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // Selected category
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null); // Track row being edited

  const {data} = useGetAllPriorities(); // Fetch priorities data from API
  const {data: dishCategories} = useGetDishCategories(); // Fetch dish categories
  const {
    mutate: addPriority,
    isSuccess: addSuccess,
    isError: addError,
  } = useAddPriority();
  const {
    mutate: updatePriority,
    isSuccess: updateSuccess,
    isError: updateError,
  } = useUpdatePriority();

  // Fetch data and process it into state
  useEffect(() => {
    if (data && selectedCategory) {
      const filteredData = data.filter(
        (item: ApiData) => item.categoryId === selectedCategory,
      );
      setProcessedData(filteredData);
    } else {
      setProcessedData([]);
    }
  }, [data, selectedCategory]);

  // Handle ratio input change
  const handleRatioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ratio = e.target.value;
    setNewRatio(ratio);
    const ratioParts = ratio.split(':').map(() => ''); // Create empty input values
    setNewValues(ratioParts);
  };

  // Handle value input changes
  const handleValueChange = (index: number, value: string) => {
    setNewValues((prev) => {
      const updatedValues = [...prev];
      updatedValues[index] = value;
      return updatedValues;
    });
  };

  // Handle save or update operation
  const handleSaveOrUpdate = async () => {
    const formattedPriorities = newRatio.split(':').map((ratio, index) => ({
      priority: `P${Number(ratio.trim())}`,
      value: Number(newValues[index]) || 0,
    }));

    const payload = {
      categoryId: selectedCategory,
      priorities: formattedPriorities,
    };

    if (editRowIndex !== null) {
      const priorityId = processedData[editRowIndex]?.id;
      const updatePayload = {...payload, id: priorityId};
      updatePriority({
        id: priorityId,
        data: updatePayload,
      });
      setEditRowIndex(null);
    } else {
      addPriority(payload);
    }

    setNewRatio('');
    setNewValues([]);
  };

  // Handle edit operation
  const handleEdit = (rowIndex: number) => {
    const rowData = processedData[rowIndex];
    const ratioString = rowData.ratios
      .map((r) => r.ratio.replace('P', ''))
      .join(':');
    const values = rowData.ratios.map((r) => r.value);

    setNewRatio(ratioString);
    setNewValues(values);
    setEditRowIndex(rowIndex);
  };

  // Show success/error toasts
  useEffect(() => {
    // if (addSuccess) toast.success('Priority added successfully!');
    // if (addError) toast.error('Failed to add Priority');
  }, [addSuccess, addError]);

  useEffect(() => {
    // if (updateSuccess) toast.success('Priority updated successfully!');
    // if (updateError) toast.error('Failed to update Priority');
  }, [updateSuccess, updateError]);

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-bold">Priority</h1>
      <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-black">
        {/* Dish Category Dropdown */}
        <div className="mb-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border-gray-300 w-full rounded border px-3 py-2 focus:outline-none dark:bg-black dark:text-white"
          >
            <option value="">Select Dish Category</option>
            {dishCategories?.data?.categories?.map(
              (category: {id: string; name: string}) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ),
            )}
          </select>
        </div>

        {/* Ratio and Values Input */}
        {selectedCategory && (
          <div className="mb-4 space-y-2">
            <input
              type="text"
              placeholder="Enter ratio (e.g., 1:2:1)"
              value={newRatio}
              onChange={handleRatioChange}
              className="border-gray-300 w-full rounded border px-3 py-2 focus:outline-none dark:bg-black dark:text-white"
              disabled={editRowIndex !== null}
            />
            <div className="flex space-x-2">
              {newValues.map((value, index) => (
                <input
                  key={index}
                  type="text"
                  placeholder={`Value ${index + 1}`}
                  value={value}
                  onChange={(e) => handleValueChange(index, e.target.value)}
                  className="border-gray-300 w-full rounded border px-3 py-2 focus:outline-none dark:bg-black dark:text-white"
                />
              ))}
            </div>
            <GenericButton
              onClick={handleSaveOrUpdate}
              className="rounded bg-primary px-6 py-3 text-white"
            >
              {editRowIndex !== null ? 'Update' : 'Save'}
            </GenericButton>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto rounded-lg border-[1.5px] border-stroke">
            <thead>
              <tr>
                <th className="border-[1.5px] px-4 py-2">Priority Ratio</th>
                <th className="border-[1.5px] px-4 py-2">Values</th>
                <th className="border-[1.5px] px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {processedData.map((row, rowIndex) => (
                <tr key={row.id}>
                  <td className="border-[1.5px] px-4 py-2">
                    {row.ratios.map((r) => r.ratio.replace('P', '')).join(':')}
                  </td>
                  <td className="border-[1.5px] px-4 py-2">
                    {row.ratios.map((r) => r.value).join(':')}
                  </td>
                  <td className="border-[1.5px] px-4 py-2">
                    <GenericButton
                      onClick={() => handleEdit(rowIndex)}
                      className="rounded bg-blue-500 px-4 py-2 text-white"
                    >
                      Edit
                    </GenericButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Priority;
