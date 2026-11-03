import React from 'react';
import GenericTable, {Column} from '../Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';
import {
  useDeleteVendor,
  useGetVendors,
} from '@/lib/react-query/queriesAndMutations/cateror/vendor';
import {ShareLink} from './ShareLink';

const DisplayVendor: React.FC = () => {
  type VendorResponse = {
    id: string;
    user?: {
      fullname?: string;
      phoneNumber?: string;
    };
    category?: string;
  };

  type Vendor = {
    id: string;
    Name: string;
    PhoneNumber: string;
    Category: string;
  };

  // Fetch vendors using the custom hook
  const {data: response, isLoading, isError, error} = useGetVendors();
  console.log('response', response);
  const {mutate: deleteVendor} = useDeleteVendor(); // Use the mutation hook

  // Transform the response to match the Vendor type
  const data: Vendor[] =
    response?.vendors?.map((vendors: VendorResponse) => ({
      id: vendors.id,
      Name: vendors.user?.fullname || 'N/A', // Default to 'N/A' if fullname is undefined
      PhoneNumber: vendors.user?.phoneNumber || 'N/A', // Default to 'N/A' if phoneNumber is undefined
      Category: vendors.category || 'N/A', // Default to 'N/A' if category is undefined
    })) || [];

  // Define the columns for the vendor table
  const columns: Column<Vendor>[] = [
    {header: 'Name', accessor: 'Name', sortable: true},
    {header: 'Phone Number', accessor: 'PhoneNumber', sortable: true},
    {header: 'Category', accessor: 'Category', sortable: true},
  ];

  const navigate = useNavigate();

  // Handle edit action
  const handleEdit = (item: Vendor) => {
    navigate({
      to: `/update/vendor/${item.id}`, // Ensure the URL is correctly formatted
    });
  };

  const handleDelete = (item: Vendor) => {
    if (window.confirm('Are you sure you want to delete this Vendor?')) {
      deleteVendor(item.id); // Call the delete mutation with the item's ID
    }
  };

  // Handle loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Handle error state
  if (isError) {
    return <div>Error: {error?.message || 'Failed to load vendors'}</div>;
  }

  return (
    <>
      <ShareLink
        onNext={() => {
          /* your code here */
        }}
      />
      <GenericTable
        title="Vendors"
        data={data}
        columns={columns}
        itemsPerPage={5}
        action
        onDelete={handleDelete}
        onEdit={handleEdit}
      />
    </>
  );
};

export default DisplayVendor;
