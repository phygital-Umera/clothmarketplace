import React from 'react';
import GenericTable, {Column} from '../Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';
import {useGetAllMaharaj} from '@/lib/react-query/queriesAndMutations/cateror/maharaj';
import {useDeleteMaharaj} from '@/lib/react-query/queriesAndMutations/cateror/maharaj'; // Adjust the import path as necessary

const DisplayMaharaj: React.FC = () => {
  type Maharaj = {
    id: string;
    Name: string;
    PhoneNumber: string;
    Specialization: string;
    Experience: string | null;
  };

  type maharaj = {
    id: string;
    user: {
      fullname: string;
      username: string;
    };
    specialization: string[];
    experience: string;
  };
  // Use the hook to fetch maharajs
  const {data: response, isLoading, isError, error} = useGetAllMaharaj();
  const {mutate: deleteMaharaj} = useDeleteMaharaj(); // Initialize the delete hook

  // Transform the response data into the format for the table
  const data: Maharaj[] =
    response?.map((item: maharaj) => ({
      id: item.id,
      Name: item.user.fullname,
      PhoneNumber: item.user.username,
      Specialization: item.specialization.join(', '),
      Experience: item.experience ? item.experience.toString() : 'N/A',
    })) || [];
  console.log('data', data);

  // Define the columns for the maharaj table
  const columns: Column<Maharaj>[] = [
    {header: 'Name', accessor: 'Name', sortable: true},
    {header: 'Phone Number', accessor: 'PhoneNumber', sortable: true},
    {header: 'Specialization', accessor: 'Specialization', sortable: true},
    {header: 'Experience', accessor: 'Experience', sortable: true},
  ];

  const navigate = useNavigate();

  const handleEdit = (item: Maharaj) => {
    navigate({
      to: `/update/maharaj/${item.id}`,
    });
  };

  const handleDelete = (item: Maharaj) => {
    if (window.confirm('Are you sure you want to delete this Maharaj?')) {
      console.log(item.id);
      deleteMaharaj(item.id); // Call the delete mutation with the item's ID
    }
  };

  // Handle loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Handle error state
  if (isError) {
    return <div>Error: {error?.message || 'Failed to load maharajs'}</div>;
  }

  return (
    <>
      <GenericTable
        title="Maharajs"
        data={data}
        columns={columns}
        itemsPerPage={5}
        action
        onDelete={handleDelete} // Pass the delete handler
        onEdit={handleEdit}
      />
    </>
  );
};

export default DisplayMaharaj;
