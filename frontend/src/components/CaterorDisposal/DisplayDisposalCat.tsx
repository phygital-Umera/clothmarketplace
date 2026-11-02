import {useEffect, useState} from 'react';
import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';
import {
  useDeleteDisposal,
  useGetDisposals,
} from '@/lib/react-query/queriesAndMutations/cateror/disposal';
import {languageId} from '@/lib/contants';
// import toast from 'react-hot-toast';

// Define the Disposal type
type Disposal = {
  id: string | null | undefined; // Allow `id` to be `string | null | undefined`
  name: string;
  category: {name: string};
};

// Define table columns for disposals
const columns: Column<Disposal>[] = [
  {header: 'Disposal Name', accessor: 'name', sortable: true},
  {
    header: 'Disposal Category',
    accessor: (disposal) => disposal.category.name,
    sortable: true,
  },
];

const DisplayDisposalCat: React.FC = () => {
  const navigate = useNavigate();
  const [disposalsData, setDisposalsData] = useState<Disposal[]>([]);

  // Fetch delete mutation
  const {mutate: deleteDisposal} = useDeleteDisposal();

  // Fetch disposals data with the selected languageId
  const {
    data: disposalsApiData,
    error,
    isLoading: isLoadingDisposals,
  } = useGetDisposals(languageId);

  // Update disposals data when the API returns results
  useEffect(() => {
    console.log('disposalsApiData', disposalsApiData);
    if (disposalsApiData?.data) {
      const transformedData: Disposal[] = disposalsApiData?.data.map(
        (disposal: Disposal) => ({
          id: disposal.id ?? undefined, // Use `undefined` if `id` is `null`
          name: disposal.name || 'N/A',
          category: {name: disposal.category?.name || 'N/A'},
        }),
      );
      console.log('transformedData', transformedData);
      setDisposalsData(transformedData);
    } else if (error) {
      console.error('Error fetching disposals:', error);
    }
  }, [disposalsApiData, error]);

  // Handle edit action
  const handleEdit = (item: Disposal) => {
    if (item.id) {
      navigate({
        to: `/update/disposalCateror/${item.id}`,
      });
    } else {
      console.warn('Attempted to edit an item without a valid ID.');
    }
  };

  // Handle delete action with check for valid ID and show toast
  const handleDelete = (item: Disposal) => {
    deleteDisposal(item.id as string);
  };

  // Show loading indicator while fetching data
  if (isLoadingDisposals) return <div>Loading...</div>;

  return (
    <div>
      <GenericTable
        data={disposalsData}
        columns={columns}
        itemsPerPage={5}
        action
        onDelete={handleDelete}
        onEdit={handleEdit}
      />
    </div>
  );
};

export default DisplayDisposalCat;
