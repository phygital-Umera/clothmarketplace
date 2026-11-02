import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';
import {useEffect, useState} from 'react';
// import toast from 'react-hot-toast';
import {
  useDeleteDishAdmin,
  useGetDishesAdmin,
} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useDishMaster} from '@/context/DishMasterContext';

type Dish = {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: string;
};

const columns: Column<Dish>[] = [
  {header: 'Dish Name', accessor: 'name', sortable: true},
  {header: 'Category', accessor: 'category', sortable: true},
  {header: 'Priority', accessor: 'priority', sortable: true},
  {header: 'Description', accessor: 'description'},
];

const DisplayDishMaster: React.FC = () => {
  const {selectedLanguageId} = useDishMaster();

  const navigate = useNavigate();
  const {data: DishNames} = useGetDishesAdmin(selectedLanguageId);
  const {mutate: deleteDish} = useDeleteDishAdmin();
  const [dishes, setDishes] = useState<Dish[]>([]);

  useEffect(() => {
    if (DishNames?.data?.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedDishes = DishNames.data.data.map((dish: any) => ({
        id: dish.id,
        name: dish.name,
        description: dish.description,
        category: dish.category?.name, // Assuming category is an object
        priority: dish.priority,
      }));
      setDishes(mappedDishes);
    }
  }, [DishNames]);
  console.log('Dish Names', DishNames);

  const handleEdit = (items: Dish) => {
    navigate({
      to: `/update/dish/${items.id}`,
    });
  };

  const handleDelete = (items: Dish) => {
    deleteDish(items.id);
  };

  return (
    <GenericTable
      data={dishes || []}
      columns={columns}
      itemsPerPage={5}
      action
      searchAble
      onDelete={handleDelete}
      onEdit={handleEdit}
    />
  );
};

export default DisplayDishMaster;
