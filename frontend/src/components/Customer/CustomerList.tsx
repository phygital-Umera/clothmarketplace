import React, {useState, useEffect} from 'react';
import {useGetAllClient} from '@/lib/react-query/queriesAndMutations/cateror/client';
// import { useNavigate } from '@tanstack/react-router';
import GenericTable, {Column} from '../Forms/Table/GenericTable';
import Loader from '../common/Loader';

type Customer = {
  id: string;
  userId: string;
  fullname: string;
  email: string;
  phoneNumber: string;
  secondaryPhoneNumber: string | null;
  address: string;
  events: string;
  pendingAmount: string;
};

const CustomerList = () => {
  const {data, isError, isSuccess, refetch} = useGetAllClient();
  console.log('Data', data);

  const [formattedData, setFormattedData] = useState<Customer[]>([]);
  // const {mutate: deleteDisposalCategory} = useDeleteClient();

  useEffect(() => {
    refetch();
    if (data?.data) {
      const formatted = data.data.map((item) => ({
        id: item.id,
        userId: item.userId,
        fullname: item.user.fullname,
        email: item.user.email,
        phoneNumber: item.user.phoneNumber,
        secondaryPhoneNumber: item.user.secondaryPhoneNumber
          ? `${item.user.secondaryPhoneNumber}`
          : '',
        address: item.address,
        events: item.events ? item.events.length : 0,
        pendingAmount: item.pendingAmount
          ? parseFloat(item.pendingAmount).toFixed(2)
          : '0.00',
      }));
      setFormattedData(formatted);
    }
  }, [data, isError, isSuccess, refetch]); // Re-run when 'data' changes

  const columns: Column<Customer>[] = [
    {header: 'Client Name', accessor: 'fullname', sortable: true},
    {header: 'Mobile No.1', accessor: 'phoneNumber', sortable: true},
    {header: 'Mobile No.2', accessor: 'secondaryPhoneNumber', sortable: true},
    {header: 'Address', accessor: 'address', sortable: true},
    {header: 'Events', accessor: 'events', sortable: true},
    {header: 'Pending Amount', accessor: 'pendingAmount', sortable: true},
  ];
  console.log('coloums', columns);

  // const handleDelete = (item: Customer) => {
  //   if (window.confirm('Are you sure you want to delete this client?')) {
  //     deleteDisposalCategory(item.id, {
  //       onSuccess: () => {
  //         setFormattedData((prev) =>
  //           prev.filter((category) => category.id !== item.id),
  //         );
  //       },
  //     });
  //   }
  // };

  if (isError) {
    return <div>Error loading sales data</div>;
  }

  if (!isSuccess || !data) {
    return <Loader />;
  }

  // const handleEdit = (item: Customer) => {
  //   navigate({
  //     to: `/updatecustomer/${item.id}`,
  //   });
  // };

  return (
    <div>
      <GenericTable
        data={formattedData || []}
        columns={columns}
        title="Customer List"
        searchAble
        // action
        // onDelete={handleDelete}
        // onEdit={handleEdit}
      />
    </div>
  );
};

export default CustomerList;
