import {useEffect, useState} from 'react';
import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';
import {
  useDeleteUtensil,
  useGetUtensils,
} from '@/lib/react-query/queriesAndMutations/cateror/utensils';
import {languageId} from '@/lib/contants';
// import {toast} from 'react-hot-toast';

// Define the UtensilFromApi type
type UtensilFromApi = {
  id: string; // Unique identifier for the utensil
  name?: string; // Name of the utensil
  category?: {
    id: string; // Category ID
    name: string; // Category name
  };
};

// Define the Utensil type (excluding languageId)
type Utensil = Omit<UtensilFromApi, 'languageId'> & {
  // Remove Language from here
};

// Define the table columns without the Language column
const columns: Column<Utensil>[] = [
  {header: 'Utensil Name', accessor: 'name', sortable: true},
  {
    header: 'Category',
    accessor: (utensil) => utensil.category?.name || 'N/A',
    sortable: true,
  },
];

const DisplayUtensilsCat: React.FC = () => {
  const navigate = useNavigate();
  const [utensilsData, setUtensilsData] = useState<Utensil[]>([]);

  const {mutate: deleteUtensil} = useDeleteUtensil();
  // Fetch utensils data with the selected languageId or a default value if undefined
  const {data: utensilsApiData, error} = useGetUtensils(
    languageId || 'defaultLanguageId', // Use a default value
  );
  console.log('utensilsApiData', utensilsApiData);

  // Update utensils data when the API returns results
  useEffect(() => {
    if (utensilsApiData?.data) {
      const transformedData: Utensil[] = utensilsApiData?.data.map(
        (utensil: UtensilFromApi) => ({
          id: utensil.id,
          name: utensil.name || 'N/A',
          category: {
            id: utensil.category?.id || 'N/A',
            name: utensil.category?.name || 'N/A',
          },
        }),
      );
      setUtensilsData(transformedData);
    } else if (error) {
      console.error('Error fetching utensils:', error);
    }
  }, [utensilsApiData, error]);

  // Handle edit action
  const handleEdit = (item: Utensil) => {
    navigate({
      to: `/update/utensilsCateror/${item.id}`,
    });
  };

  const handleDelete = (items: Utensil) => {
    if (items.id) {
      deleteUtensil(items.id, {
        onSuccess: () => {},
      });
    }
  };

  return (
    <div>
      {/* Table displaying utensils */}
      <GenericTable
        data={utensilsData}
        columns={columns}
        itemsPerPage={5}
        action
        onDelete={handleDelete} // Implement delete functionality if needed
        onEdit={handleEdit}
      />
    </div>
  );
};

export default DisplayUtensilsCat;
