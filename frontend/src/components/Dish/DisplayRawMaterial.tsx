import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {
  useDeleteRawMaterialAdmin,
  useGetRawMaterialAdmin,
} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import {useNavigate} from '@tanstack/react-router';
import {useEffect, useState} from 'react';
// import toast from 'react-hot-toast'; // Import toast

type Language = {
  id: string;
  name: string;
};

type RawMaterial = {
  id: string;
  name: string;
  unit: string;
  category: {name: string}; // Keeping this for data transformation
};

const columns: Column<RawMaterial>[] = [
  {header: 'Raw Material Name', accessor: 'name', sortable: true},
  {header: 'Unit', accessor: 'unit', sortable: false},
];

const DisplayRawMaterial: React.FC = () => {
  const navigate = useNavigate();
  const [rawMaterialData, setRawMaterialData] = useState<RawMaterial[]>([]);
  const [languageId, setLanguageId] = useState<string | undefined>(undefined);

  const {data: languagesData, isLoading: isLoadingLanguages} =
    useGetLanguages();
  const {mutate: deleteRawMaterialAdmin} = useDeleteRawMaterialAdmin();

  const {
    data: rawMaterialApiData,
    isSuccess,
    error,
    isLoading,
    refetch,
  } = useGetRawMaterialAdmin(languageId || '');

  useEffect(() => {
    if (languageId) {
      // Refetch data when languageId changes
      refetch();
    }
  }, [languageId, refetch]);

  useEffect(() => {
    if (rawMaterialApiData?.data && Array.isArray(rawMaterialApiData.data)) {
      const transformedData: RawMaterial[] = rawMaterialApiData.data.map(
        (rawMaterial: RawMaterial) => ({
          id: rawMaterial.id,
          name: rawMaterial.name,
          unit: rawMaterial.unit,
          category: {name: rawMaterial.category?.name}, // Keeping category for transformation
        }),
      );
      setRawMaterialData(transformedData);
    } else if (error) {
      console.error('Error fetching raw materials:', error);
    }
  }, [rawMaterialApiData, error, isSuccess]);

  const handleLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const selectedLanguageId = event.target.value;
    setLanguageId(selectedLanguageId);
  };

  const handleEdit = (item: RawMaterial) => {
    navigate({
      to: `/update/rawMaterial/${item.id}`,
    });
  };

  if (isLoading || isLoadingLanguages) return <div>Loading...</div>;

  const handleDelete = (item: RawMaterial) => {
    deleteRawMaterialAdmin(item.id, {
      onSuccess: () => {
        // Optionally, you could also refetch data or remove the deleted item from the UI
        setRawMaterialData((prev) =>
          prev.filter((material) => material.id !== item.id),
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        console.error(`Failed to delete "${item.name}": ${error.message}`);
      },
    });
  };

  return (
    <>
      <label
        htmlFor="language-select"
        className="mb-2.5 block text-black dark:text-white"
      >
        Select Language
      </label>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
        <div className="col-span-12 mb-8 md:col-span-6">
          <select
            id="language-select"
            value={languageId}
            onChange={handleLanguageChange}
            className="w-full rounded border-[1.5px] border-stroke bg-transparent px-4 py-3 outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
          >
            <option value="" disabled>
              Select a language
            </option>
            {languagesData.map((language: Language) => (
              <option key={language.id} value={language.id}>
                {language.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <GenericTable
        data={rawMaterialData || []}
        columns={columns}
        action
        searchAble
        onDelete={handleDelete}
        onEdit={handleEdit}
      />
    </>
  );
};

export default DisplayRawMaterial;
