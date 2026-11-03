import React from 'react';
import GenericTable, {Column} from '../Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';
import {
  useDeleteStaff,
  useGetAllStaff,
} from '@/lib/react-query/queriesAndMutations/cateror/staff';

const DisplayStaff: React.FC = () => {
  type StaffResponse = {
    id: string;
    user: {
      fullname: string;
      phoneNumber: string;
      email: string;
    };
    jobTitle: string;
    address: string;
  };

  type Staff = {
    id: string;
    Name: string;
    PhoneNumber: string;
    Email: string;
    JobType: string;
    Address: string;
  };

  // Use the hook to fetch staff members
  const {data: response, isLoading, isError, error} = useGetAllStaff();
  const {mutate: deleteStaff} = useDeleteStaff(); // Use the mutation hook

  // Map the response data to match the required structure
  const data: Staff[] =
    response?.map((staff: StaffResponse) => ({
      id: staff.id,
      Name: staff.user.fullname,
      PhoneNumber: staff.user.phoneNumber,
      Email: staff.user.email,
      JobType: staff.jobTitle,
      Address: staff.address,
    })) || [];

  // Define the columns for the staff table
  const columns: Column<Staff>[] = [
    {header: 'Name', accessor: 'Name', sortable: true},
    {header: 'Phone Number', accessor: 'PhoneNumber', sortable: true},
    {header: 'Email', accessor: 'Email', sortable: true},
    {header: 'Job Type', accessor: 'JobType', sortable: true},
    {header: 'Address', accessor: 'Address', sortable: true},
  ];

  const navigate = useNavigate();

  const handleEdit = (item: Staff) => {
    navigate({
      to: `/update/staff/${item.id}`, // Ensure the URL is correctly formatted
    });
  };

  const handleDelete = (item: Staff) => {
    if (window.confirm('Are you sure you want to delete this Staff?')) {
      deleteStaff(item.id); // Call the delete mutation with the item's ID
    }
  };

  // Handle loading state
  if (isLoading) {
    return <div>Loading...</div>; // Simple loading message
  }

  // Handle error state
  if (isError) {
    return <div>Error: {error?.message || 'Failed to load staff members'}</div>; // Simple error message
  }

  return (
    <GenericTable
      title="Staff Members"
      data={data} // Use mapped data
      columns={columns}
      itemsPerPage={5}
      action
      onDelete={handleDelete}
      onEdit={handleEdit}
    />
  );
};

export default DisplayStaff;
