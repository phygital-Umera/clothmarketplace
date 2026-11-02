import {useGetCaterors} from '@/lib/react-query/queriesAndMutations/admin/cateror';
import React from 'react';
import GenericTable, {Column} from '../Forms/Table/GenericTable';

type Caterer = {
  id: number;
  fullname: string;
  phoneNumber: string;
  address: string;
  expiryDate: string;
  renewalAmount: string;
};
const ExpiryDate: React.FC = () => {
  const {data, isSuccess, isError, isPending} = useGetCaterors();
  console.log('Fetched Data:', data);

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error loading caterors.</div>;
  }

  if (!isSuccess || !data?.data?.data || !Array.isArray(data.data.data)) {
    return <div>No data available.</div>;
  }

  // Transform data to match GenericTable format
  const transformedData = data.data.data.map((member) => ({
    id: member.id,
    fullname: member.fullname,
    phoneNumber: member.phoneNumber,
    address: member.address,
    expiryDate: new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(member.expiryDate)),
    renewalAmount: `₹${member.renewalAmount}`,
  }));

  // Define columns for GenericTable
  const columns: Column<Caterer>[] = [
    {accessor: 'fullname', header: 'Caterer Name'},
    {accessor: 'phoneNumber', header: 'Phone Number'},
    {accessor: 'address', header: 'Address'},
    {accessor: 'expiryDate', header: 'Expiry Date'},
    {accessor: 'renewalAmount', header: 'Renewal Amount'},
  ];

  // Dummy handlers for edit and delete actions
  // const handleEdit = (id) => {
  //   console.log('Edit Caterer:', id);
  // };

  // const handleDelete = (id) => {
  //   console.log('Delete Caterer:', id);
  // };

  return (
    <div className="h-full w-full overflow-auto bg-white p-4 dark:border-strokedark dark:bg-boxdark">
      <h4 className="text-md mb-4 font-semibold text-black dark:text-white">
        Near Expiry Date Caterers
      </h4>
      <GenericTable
        title="Caterers"
        data={transformedData}
        columns={columns}
        itemsPerPage={5}
        // action
        // onDelete={handleDelete}
        // onEdit={handleEdit}
      />
    </div>
  );
};

export default ExpiryDate;
