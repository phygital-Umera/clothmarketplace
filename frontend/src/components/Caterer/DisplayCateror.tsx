import React from 'react';
import GenericTable, {Column} from '../Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';
import {useGetCaterors} from '@/lib/react-query/queriesAndMutations/admin/cateror';
import {useDeleteCateror} from '@/lib/react-query/queriesAndMutations/admin/cateror';

const DisplayCateror: React.FC = () => {
  type Caterer = {
    Name: string;
    PhoneNumber: string;
    City: string;
    subscriptionPlan: string;
    userId: string;
    Id: string;
  };

  type cateror = {
    id: string;
    fullname: string;
    phoneNumber: string;
    address: string;
    subscriptionPlan: string;
    username: string;
  };

  const {data: CaterorResponse} = useGetCaterors();
  console.log(' CaterorResponse: ', CaterorResponse);
  const {mutate: deleteCateror} = useDeleteCateror();

  // Transform the data for the table
  const transformedData: Caterer[] =
    CaterorResponse?.data.data.map((cateror: cateror) => ({
      Name: cateror.fullname,
      PhoneNumber: cateror.phoneNumber,
      City: cateror.address,
      subscriptionPlan: cateror.subscriptionPlan,
      userId: cateror.username,
      Id: cateror.id,
    })) || [];

  // Define the columns for the caterer table
  const columns: Column<Caterer>[] = [
    {header: 'Name', accessor: 'Name', sortable: true},
    {header: 'Phone Number', accessor: 'PhoneNumber', sortable: true},
    {header: 'City', accessor: 'City', sortable: true},
    {header: 'Plan', accessor: 'subscriptionPlan', sortable: true},
    {header: 'Username', accessor: 'userId', sortable: true},
  ];

  const navigate = useNavigate();
  const handleEdit = (items: Caterer) => {
    navigate({
      to: `/update/cateror/${items.Id}`,
    });
  };

  // const handleDelete = (items: Caterer) => {
  //   deleteCateror(items.Id); // Pass the Id string directly
  // };
  return (
    <>
      <GenericTable
        title="Caterors"
        data={transformedData}
        columns={columns}
        itemsPerPage={5}
        action
        // onDelete={handleDelete}
        onEdit={handleEdit}
      />
    </>
  );
};

export default DisplayCateror;
