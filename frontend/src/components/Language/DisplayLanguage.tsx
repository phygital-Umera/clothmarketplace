import React from 'react';
import GenericTable, {Column} from '../Forms/Table/GenericTable';
import {
  useDeleteLanguage,
  useGetLanguages,
} from '@/lib/react-query/queriesAndMutations/admin/languages';
// import {toast} from 'react-hot-toast'; // Import toast for notifications

const DisplayLanguage: React.FC = () => {
  type Language = {
    id: string;
    name: string;
    code: string;
  };

  // Fetch languages using the hook
  const {
    data: languages,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetLanguages();

  // Hook for deleting a language
  const {mutate: deleteLanguage} = useDeleteLanguage();

  // Define columns for the table (without Update action)
  const columns: Column<Language>[] = [
    {header: 'Language Name', accessor: 'name'},
    {header: 'Language Code', accessor: 'code'},
  ];

  const handleDelete = (language: Language) => {
    deleteLanguage(language.id, {
      onSuccess: () => refetch(),
    });
  };

  // Handle loading state
  if (isLoading) {
    return <div>Loading languages...</div>;
  }

  // Handle error state
  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <>
      <GenericTable
        title="Languages"
        data={languages || []} // Ensure empty array if no data
        columns={columns}
        action={true} // Show only delete action
        onDelete={handleDelete} // Pass the handleDelete function
      />
    </>
  );
};

export default DisplayLanguage;
