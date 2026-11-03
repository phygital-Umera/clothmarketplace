import {useEffect, useState} from 'react';
import {useNavigate} from '@tanstack/react-router';
import {
  useDeleteUtensil,
  useGetUtensils,
} from '@/lib/react-query/queriesAndMutations/admin/utensils';
// import toast from 'react-hot-toast';
import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';

// Define the UtensilFromApi type
type UtensilFromApi = {
  id: string; // Unique identifier for the utensil
  name?: string; // Name of the utensil
  category?: {
    id: string; // Category ID
    name: string; // Category name
  };
  languageId?: string | number; // Optional language ID
};

// Define the Utensil type (excluding languageId)
type Utensil = Omit<UtensilFromApi, 'languageId'>;

const columns: Column<Utensil>[] = [
  {header: 'Utensil Name', accessor: 'name', sortable: true},
  {
    header: 'Category',
    accessor: (utensil) => utensil.category?.name || 'N/A',
    sortable: true,
  },
];

const DisplayUtensils: React.FC = () => {
  const navigate = useNavigate();
  const [utensilsData, setUtensilsData] = useState<Utensil[]>([]);
  const [languageId] = useState<string | undefined>(undefined);

  const {mutate: deleteUtensil} = useDeleteUtensil();
  const {
    data: utensilsApiData,
    error,
    isLoading: isLoadingUtensils,
  } = useGetUtensils({languageId});

  // Update utensils data when the API returns results
  useEffect(() => {
    if (utensilsApiData?.data) {
      const transformedData: Utensil[] = utensilsApiData.data.data.map(
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

  const handleEdit = (item: Utensil) => {
    navigate({
      to: `/update/utensils/${item.id}`, // Updated to use id for editing
    });
  };

  // Show loading indicator while fetching data
  if (isLoadingUtensils) return <div>Loading...</div>;

  const handleDelete = (item: Utensil) => {
    // Call the delete function with the item's id
    deleteUtensil(item.id, {
      onSuccess: () => {
        // toast.success('Utensil deleted successfully!');
        setUtensilsData((prevData) =>
          prevData.filter((utensil) => utensil.id !== item.id),
        );
      },
      onError: (err) => {
        // toast.error('Error deleting utensil: ' + err.message);
      },
    });
  };

  return (
    <div>
      {/* Table displaying utensils */}
      <GenericTable
        data={utensilsData}
        columns={columns}
        itemsPerPage={5}
        action
        onDelete={handleDelete} // Implement delete functionality
        onEdit={handleEdit}
      />
    </div>
  );
};

export default DisplayUtensils;
