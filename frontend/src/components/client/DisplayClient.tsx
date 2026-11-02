import {useEffect, useState} from 'react';
import {useNavigate} from '@tanstack/react-router';
import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';

import {
  useDeleteClient,
  useGetAllClient,
} from '@/lib/react-query/queriesAndMutations/cateror/client';

type Client = {
  id: string;
  fullname: string;
  phoneNumber: string;
  // secondaryPhoneNumber: string;
  address: string;
  caste: string;
  pendingAmount: string;
  events: string;
};

const columns: Column<Client>[] = [
  {header: 'Client Name', accessor: 'fullname', sortable: true},
  {header: 'Mobile No.', accessor: 'phoneNumber', sortable: true},
  // {
  //   header: 'Secondary Mobile No.',
  //   accessor: 'secondaryPhoneNumber',
  //   sortable: true,
  // },
  {header: 'Address', accessor: 'address', sortable: true},
  {header: 'Caste', accessor: 'caste', sortable: true},
  {header: 'Events', accessor: 'events', sortable: true},
  {header: 'Pending Amount', accessor: 'pendingAmount', sortable: true},
];

const DisplayClient: React.FC = () => {
  const navigate = useNavigate();
  const [clientData, setClientData] = useState<Client[]>([]);

  const {
    data: clientApiData,
    isLoading: isLoadingClients,
    refetch,
    isFetched,
  } = useGetAllClient();
  console.log('clientApiData', clientApiData);

  const {mutate: deleteClient} = useDeleteClient();

  useEffect(() => {
    refetch();
    if (clientApiData?.data) {
      const mappedData =
        Array.isArray(clientApiData.data) &&
        clientApiData.data.map((item) => {
          const {id} = item;
          const {fullname, phoneNumber, secondaryPhoneNumber, email} =
            item.user;
          const {caste, address, pendingAmount} = item;
          return {
            id,
            fullname,
            phoneNumber,
            // secondaryPhoneNumber,
            email,
            caste: caste || '-',
            address,
            pendingAmount,
            events: item.events ? item.events.length : 0,
          };
        });
      setClientData(mappedData);
    }
  }, [clientApiData, navigate, isFetched]);

  // Handle edit functionality
  const handleEdit = (item: Client) => {
    navigate({
      to: `/update/client/${item.id}`, // Use the process ID for the route
    });
  };

  // Handle delete functionality
  const handleDelete = (item: Client) => {
    deleteClient(item.id); // Call the mutation to delete the process by ID
  };

  // Show loading indicator while fetching data
  if (isLoadingClients) return <div>Loading...</div>;

  return (
    <div>
      {/* Table displaying processes */}
      <GenericTable
        data={clientData || []}
        columns={columns}
        itemsPerPage={10}
        searchAble
        action
        onDelete={handleDelete} // Implement delete functionality
        onEdit={handleEdit}
      />
    </div>
  );
};

export default DisplayClient;
