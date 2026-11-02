import {
  useAddMultipleDishRawMaterials,
  useGetDishCategories,
  useGetRawMaterialsCateror,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {useGetProcesses} from '@/lib/react-query/queriesAndMutations/cateror/process';
import React, {useEffect, useState} from 'react';
import {FaPlus, FaTrash} from 'react-icons/fa';
import {useAuthContext} from '@/context/AuthContext';
import toast from 'react-hot-toast';
import SearchableDropdown from '../CustomDropdown/SearchableDropdown';

const MultipleDishAdd = () => {
  const {user} = useAuthContext();
  const caterorid = user?.caterorId;
  const [dishName, setDishName] = useState('');
  const [dishCategory, setDishCategory] = useState('');
  const [categoryOptions, setCategoryOptions] = useState([]);

  const {data: dishCategories} = useGetDishCategories();

  const {data: rawMaterialData} = useGetRawMaterialsCateror();
  const {data: processesData} = useGetProcesses();
  const {
    mutateAsync: addMultipleDishRawMaterials,
    isSuccess,
    isError,
    isPending,
  } = useAddMultipleDishRawMaterials();
  const processOptions = processesData?.data.processes?.map(
    (process: {id: string; name: string}) => ({
      value: process.id,
      label: process.name,
    }),
  );

  const rawmaterialOptions = rawMaterialData?.data.rawMaterials?.map(
    (material: {id: string; name: string; unit: string}) => ({
      value: material.id,
      label: material.name,
      unit: material.unit,
    }),
  );

  useEffect(() => {
    if (dishCategories?.data?.categories) {
      setCategoryOptions(
        dishCategories?.data?.categories.map(
          (category: {id: string; name: string}) => ({
            value: category.id,
            label: category.name,
          }),
        ),
      );
    }
  }, [dishCategories]);

  const [columns, setColumns] = useState([
    {id: Date.now(), people: '', kg: ''},
  ]);

  const [rows, setRows] = useState([
    {
      id: Date.now(),
      rawMaterial: '',
      process: '',
      unit: '',
      quantities: {}, // key: columnId, value: quantity
    },
  ]);

  const addColumn = () => {
    setColumns([...columns, {id: Date.now(), people: '', kg: ''}]);
  };

  const removeColumn = (id) => {
    setColumns(columns.filter((col) => col.id !== id));
    setRows(
      rows.map((row) => {
        const newQuantities = {...row.quantities};
        delete newQuantities[id];
        return {...row, quantities: newQuantities};
      }),
    );
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: Date.now(),
        rawMaterial: '',
        process: '',
        quantities: {},
      },
    ]);
  };
  const removeRow = () => {
    setRows((prev) => prev.slice(0, -1));
  };

  const handleQtyChange = (rowId, colId, value) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              quantities: {
                ...row.quantities,
                [colId]: value,
              },
            }
          : row,
      ),
    );
  };

  const handleSubmit = () => {
    // Check for basic dish info
    if (!dishName.trim() || !dishCategory) {
      toast.error('Please fill all the records');
      return;
    }

    // Validate columns
    for (const col of columns) {
      if (!col.people || !col.kg) {
        toast.error('Please fill all the records');
        return;
      }
    }

    // Validate each row for each column
    for (const row of rows) {
      if (!row.rawMaterial || !row.process) {
        toast.error('Please fill all the records');
        return;
      }

      for (const col of columns) {
        if (!row.quantities[col.id]) {
          toast.error('Please fill all the records');
          return;
        }
      }
    }

    // Proceed with submit if all validations pass
    const prices = columns.map((col) => {
      const rawMaterials = rows
        .filter(
          (row) => row.rawMaterial && row.process && row.quantities[col.id],
        )
        .map((row) => ({
          rawMaterialId: row.rawMaterial,
          processId: row.process,
          quantity: parseFloat(row.quantities[col.id]),
        }));

      return {
        people: parseInt(col.people),
        kg: parseFloat(col.kg),
        rawMaterials,
      };
    });

    const data = {
      caterorid: caterorid!,
      dishName,
      dishCategoryId: dishCategory,
      prices,
    };

    addMultipleDishRawMaterials(data);
  };

  useEffect(() => {
    if (isSuccess) {
      setDishName('');
      setDishCategory('');
      setColumns([{id: Date.now(), people: '', kg: ''}]);
      setRows([{id: Date.now(), rawMaterial: '', process: '', quantities: {}}]);
      toast.success('Dish added successfully!');
    }
    if (isError) {
      toast.error('Failed to add dish!');
    }
  }, [isSuccess, isError]);

  return (
    <div className="space-y-4 bg-white p-6 dark:bg-black">
      <h2 className="text-2xl font-bold">Multiple Dish Add</h2>

      <div className="flex gap-4">
        <input
          className="w-full rounded-md border border-stroke bg-transparent px-3 py-3 text-sm text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary dark:disabled:bg-black"
          placeholder="Enter Dish Name"
          value={dishName}
          onChange={(e) => setDishName(e.target.value)}
        />
        <div className="w-full">
          <SearchableDropdown
            // className="w-full rounded-md border border-stroke bg-transparent px-3 py-3 text-sm text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary dark:disabled:bg-black"
            placeholder="Select Category"
            options={categoryOptions}
            value={dishCategory}
            onChange={(selected) => setDishCategory(selected ?? '')}
          />
        </div>
        <button
          className="hover:bg-primary-dark mx-1 flex items-center rounded bg-primary px-8 py-2 text-sm text-white transition duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-50"
          onClick={addColumn}
        >
          Add Column
        </button>
      </div>

      <div className="overflow-hideen rounded border border-stroke dark:border-strokedark">
        <div className="overflow-x-auto">
          <table className="min-w-max text-left text-sm">
            <thead className="border-b border-stroke bg-gray-2 dark:border-strokedark dark:bg-meta-4">
              <tr>
                <th className="w-60 p-2">Raw Material</th>
                <th className="w-60 p-2">Process</th>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className="w-32 border-b border-stroke p-2 text-center dark:border-strokedark"
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <input
                        type="text"
                        placeholder="People"
                        className="w-full rounded-md border border-stroke bg-transparent px-3 py-3 text-sm text-black outline-none dark:border-form-strokedark dark:bg-form-input dark:text-white"
                        value={col.people}
                        onChange={(e) =>
                          setColumns((prev) =>
                            prev.map((c) =>
                              c.id === col.id
                                ? {...c, people: e.target.value}
                                : c,
                            ),
                          )
                        }
                      />
                      <input
                        type="text"
                        placeholder="Kg"
                        className="w-full rounded-md border border-stroke bg-transparent px-3 py-3 text-sm text-black outline-none dark:border-form-strokedark dark:bg-form-input dark:text-white"
                        value={col.kg}
                        onChange={(e) =>
                          setColumns((prev) =>
                            prev.map((c) =>
                              c.id === col.id ? {...c, kg: e.target.value} : c,
                            ),
                          )
                        }
                      />
                      <button
                        className="mt-2 text-xs text-graydark dark:text-gray-2"
                        onClick={() => removeColumn(col.id)}
                      >
                        <FaTrash className="mb-2 h-3 w-3" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="w-60 p-2">
                    <SearchableDropdown
                      options={rawmaterialOptions}
                      value={row.rawMaterial}
                      onChange={(value) => {
                        const selectedOption = rawmaterialOptions.find(
                          (opt) => opt.value === value,
                        );
                        setRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id
                              ? {
                                  ...r,
                                  rawMaterial: value,
                                  unit: selectedOption?.unit || '',
                                }
                              : r,
                          ),
                        );
                      }}
                      placeholder="Select Material"
                      style={{zIndex: 999}}
                    />
                  </td>
                  <td className="w-60 p-2">
                    <SearchableDropdown
                      placeholder="Select Process"
                      options={processOptions}
                      value={row.process}
                      onChange={(value) =>
                        setRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? {...r, process: value} : r,
                          ),
                        )
                      }
                    />
                  </td>
                  {columns.map((col) => (
                    <td key={col.id} className="w-40 p-2 text-center">
                      <div className="relative">
                        <input
                          type="text"
                          className="w-full rounded-md border border-stroke bg-transparent px-3 py-3 pr-10 text-sm text-black outline-none dark:border-form-strokedark dark:bg-form-input dark:text-white"
                          value={row.quantities[col.id] || ''}
                          placeholder="Qty"
                          onChange={(e) =>
                            handleQtyChange(row.id, col.id, e.target.value)
                          }
                        />
                        {row.unit && (
                          <span className="text-gray-500 dark:text-gray-300 absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                            {row.unit}
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex justify-between gap-4">
        <div className="flex gap-4">
          <button
            onClick={addRow}
            className="hover:bg-primary-dark flex items-center rounded bg-primary px-8 py-2 text-white transition duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaPlus className="mr-2" />
            Add Row
          </button>
          <button
            onClick={removeRow}
            disabled={rows.length <= 1}
            className="flex items-center rounded bg-primary px-8 py-2 text-white transition duration-300 ease-in-out hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaTrash className="mr-2" />
            Remove Row
          </button>
        </div>

        <button
          onClick={handleSubmit}
          className="hover:bg-primary-dark flex items-center rounded bg-primary px-8 py-2 text-white transition duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
};

export default MultipleDishAdd;
