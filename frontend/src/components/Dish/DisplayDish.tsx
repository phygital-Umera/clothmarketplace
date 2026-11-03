import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';
import {
  useDeleteDishAdmin,
  useGetDishesAdmin,
} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import {FiChevronDown} from 'react-icons/fi';
import {useEffect, useMemo, useState} from 'react';

type Dish = {
  id: string;
  name: string;
  category: {name: string};
  priority: number;
  description: string;
};

const columns: Column<Dish>[] = [
  {header: 'Dish Name', accessor: 'name', sortable: true},
  {header: 'Category', accessor: 'category', sortable: true},
  {header: 'Priority', accessor: 'priority', sortable: true},
];

const DisplayDish: React.FC = () => {
  const navigate = useNavigate();
  const [selectedLanguageId, setSelectedLanguageId] = useState<
    string | undefined
  >(undefined);

  const [dishData, setDishData] = useState<Dish[]>([]);

  const {data: Languages} = useGetLanguages();

  const {data, refetch} = useGetDishesAdmin(selectedLanguageId || ''); // Pass language ID
  console.log('Dish Data', data);

  const {mutateAsync: deleteDish} = useDeleteDishAdmin();

  // Refetch data when language changes
  useEffect(() => {
    if (selectedLanguageId) {
      refetch();
    }
  }, [selectedLanguageId, refetch]);

  useEffect(() => {
    if (data) {
      const dishes = data?.data?.data || [];

      const dishRows = dishes.map(
        (dish: {
          id: string;
          name: string;
          category: {name: string};
          priority: number;
        }) => ({
          id: dish.id,
          name: dish.name,
          category: dish.category.name,
          priority: dish.priority,
        }),
      );

      setDishData(dishRows);
    }
  }, [data]);

  return (
    <div className="min-h-screen rounded-lg p-4 dark:bg-slate-800">
      <div className="relative py-5 md:w-1/3">
        <select
          className="relative z-20 w-full appearance-none rounded border border-stroke bg-transparent bg-white px-12 py-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
          onChange={(e) => setSelectedLanguageId(e.target.value)} // Set selected language
        >
          <option
            value=""
            disabled
            selected
            className="text-body dark:text-bodydark"
          >
            Select Language
          </option>
          {Languages?.map((language: {id: string; name: string}) => (
            <option
              key={language.id}
              value={language.id}
              className="text-body dark:text-bodydark"
            >
              {language.name.toUpperCase()}
            </option>
          ))}
        </select>

        {/* Dropdown Icon */}
        <FiChevronDown className="text-gray-500 pointer-events-none absolute right-4 top-1/2 z-99 -translate-y-1/2 rounded-sm text-2xl text-graydark dark:text-gray-2" />
      </div>

      <GenericTable
        data={dishData || []} // Use fetched dishes or empty array
        columns={columns}
        title="Dishes"
        itemsPerPage={20}
        action
        onDelete={(items: Dish) => {
          deleteDish(items.id);
        }}
      />
    </div>
  );
};

export default DisplayDish;
