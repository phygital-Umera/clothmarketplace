import {useEffect, useState} from 'react';
import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';
import {
  useDeleteDisposal,
  useGetDisposal,
} from '@/lib/react-query/queriesAndMutations/admin/disposal';

// Define the Disposal type
type DisposalFromApi = {
  id: string;
  name: string;
  category: {name: string}; // Category object containing name
};

type Disposal = Omit<DisposalFromApi, 'languageId'> & {
  // Remove Language from here
};

// Define table columns for disposals
const columns: Column<Disposal>[] = [
  {header: 'Disposal Name', accessor: 'name', sortable: true},
  {
    header: 'Disposal Category',
    accessor: (disposal) => disposal.category?.name,
    sortable: true,
  },
];

const DisplayDisposal: React.FC = () => {
  const navigate = useNavigate();
  const [disposalsData, setDisposalsData] = useState<Disposal[]>([]);
  const [languageId] = useState<string | undefined>(undefined);

  const {mutate: deleteDisposal} = useDeleteDisposal();
  const {
    data: disposalsApiData,
    error,
    isLoading: isLoadingDisposals,
  } = useGetDisposal({languageId});

  console.log(disposalsApiData); // Check the API response

  useEffect(() => {
    if (disposalsApiData?.data) {
      const transformedData: Disposal[] = disposalsApiData.data.data.map(
        (disposal: DisposalFromApi) => ({
          id: disposal.id,
          name: disposal.name || 'N/A',
          category: {
            name: disposal.category?.name || 'N/A',
          },
        }),
      );
      console.log('Transformed Disposal Data:', transformedData); // Check transformed data
      setDisposalsData(transformedData);
    } else if (error) {
      console.error('Error fetching disposals:', error);
    }
  }, [disposalsApiData, error]);

  // Handle edit action
  const handleEdit = (item: Disposal) => {
    navigate({
      to: `/update/disposal/${item.id}`, // Updated to use id for editing
    });
  };

  // Show loading indicator while fetching data
  if (isLoadingDisposals) return <div>Loading...</div>;

  const handleDelete = (items: Disposal) => {
    // Call the delete function with the item's id
    deleteDisposal(items.id);
  };

  return (
    <div>
      {/* Table displaying disposals */}
      <GenericTable
        data={disposalsData}
        columns={columns}
        itemsPerPage={5}
        action
        onDelete={handleDelete} // Implement delete functionality if needed
        onEdit={handleEdit}
      />
    </div>
  );
};

export default DisplayDisposal;
