/* eslint-disable  */
import {
  useDeleteRawMaterial,
  useGetRawMaterialCategoriesCat,
  useGetRawMaterialsCateror,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {
  useAddRawMaterialcaterorPrice,
  useGetRawMaterialcaterorPrice,
} from '@/lib/react-query/queriesAndMutations/cateror/rawmaterialprice';
import {useNavigate} from '@tanstack/react-router';
import {useState} from 'react';
// import toast from 'react-hot-toast';

type RawMaterial = {
  rawMaterialId: string;
  amount: number;
};

const AddPriceRawmaterial: React.FC = () => {
  const navigate = useNavigate();
  const {data: rawMaterial} = useGetRawMaterialsCateror();
  console.log('rawMaterial', rawMaterial);

  const {mutateAsync: addRawMaterialPrice} = useAddRawMaterialcaterorPrice();

  // State to manage prices
  const [prices, setPrices] = useState<Record<string, number>>({});

  const rawMaterials =
    (Array.isArray(rawMaterial?.data.rawMaterials) &&
      rawMaterial?.data.rawMaterials
        .map(
          (item: {
            id: string;
            name: string;
            categoryId: string;
            unit: string;
            amount: number;
          }) => ({
            id: item.id,
            name: item.name,
            category: item.category.name,
            unit: item.unit,
            amount: item.amount,
          }),
        )
        // Sort alphabetically by name
        .sort((a: any, b: any) => a.name.localeCompare(b.name))) ||
    [];

  const {mutateAsync: deleteRawMaterial} = useDeleteRawMaterial();

  const handlePriceChange = (id: string, value: number) => {
    setPrices((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSavePrices = async () => {
    const pricesArray = Object.entries(prices).map(
      ([rawMaterialId, price]) => ({
        rawMaterialId,
        amount: Number(price),
      }),
    );

    try {
      await addRawMaterialPrice(pricesArray);
      // toast.success('Raw Material prices saved successfully!');
      setPrices({}); // Clear the prices after successful save
    } catch (error) {
      // toast.error('Failed to save raw material prices. Please try again.');
      console.error('Error saving prices:', error);
    }
  };

  return (
    <div className="">
      <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <h2 className="mb-4 text-xl font-bold">Raw Materials Pricing</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-gray-2 text-left dark:bg-meta-4">
              <tr>
                <th className="px-4 py-3 font-medium text-black dark:text-white">
                  Raw Material Name
                </th>
                <th className="px-4 py-3 font-medium text-black dark:text-white">
                  Category
                </th>
                <th className="px-4 py-3 font-medium text-black dark:text-white">
                  Unit
                </th>
                <th className="px-4 py-3 font-medium text-black dark:text-white">
                  Current Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-2 dark:divide-strokedark">
              {rawMaterials.map((item: any) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-4 py-4 text-black dark:text-white">
                    {item.name}
                  </td>
                  <td className="text-gray-600 dark:text-gray-300 whitespace-nowrap px-4 py-4">
                    {item.category}
                  </td>
                  <td className="text-gray-600 dark:text-gray-300 whitespace-nowrap px-4 py-4">
                    {item.unit}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <input
                      type="number"
                      className="w-24 rounded border border-stroke bg-transparent px-2 py-1 text-sm text-black shadow-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-strokedark dark:bg-form-input dark:text-white"
                      value={prices[item.id] ?? item.amount}
                      onChange={(e) =>
                        handlePriceChange(item.id, parseFloat(e.target.value))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSavePrices}
          className="inline-flex items-center rounded-md border border-transparent bg-primary px-8 py-3 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Save Prices
        </button>
      </div>
    </div>
  );
};

export default AddPriceRawmaterial;
