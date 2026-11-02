import {useEffect, useState} from 'react';
import {useNavigate} from '@tanstack/react-router';
import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {useGetProcesses} from '@/lib/react-query/queriesAndMutations/cateror/process';
import {Process as APIProcess} from '@/types/cateror'; // Import the correct Process type
import {deleteProcess} from '@/lib/api/cateror/process';
import toast from 'react-hot-toast';

// Adjust your local type to match the API response or use the imported one directly
type Process = APIProcess;

const columns: Column<Process>[] = [
  {header: 'Process Name', accessor: 'name', sortable: true}, // Accessor should match the actual field ('name')
];

const DisplayProcessCat: React.FC = () => {
  const navigate = useNavigate();
  const [processData, setProcessData] = useState<Process[]>([]);
  const [languageId] = useState<string | undefined>(undefined);

  // Fetch processes from the API
  const {
    data: processesApiData,
    error,
    isLoading: isLoadingProcesses,
  } = useGetProcesses({languageId: languageId});

  // Update state with the fetched processes
  useEffect(() => {
    if (processesApiData?.data.processes) {
      setProcessData(processesApiData.data.processes as Process[]); // Cast to Process[] type if necessary
    } else if (error) {
      console.error('Error fetching processes:', error);
    }
  }, [processesApiData, error]);

  // Handle edit functionality
  const handleEdit = (item: Process) => {
    navigate({
      to: `/update/processCateror/${item.id}`, // Use the process ID for the route
    });
  };

  // Handle delete functionality
  const handleDelete = async (item: Process) => {
    try {
      await deleteProcess(item.id); // Perform the delete operation
      toast.success(`Process "${item.name}" deleted successfully.`);
      // Immediately update the table data after deletion
      setProcessData((prevData) =>
        prevData.filter((process) => process.id !== item.id),
      );
    } catch (error) {
      console.error('Error deleting process:', error);
      toast.error(
        'This item is linked to other records and cannot be deleted.',
      );
    }
  };

  // Show loading indicator while fetching data
  if (isLoadingProcesses) return <div>Loading...</div>;

  return (
    <div>
      {/* Table displaying processes */}
      <GenericTable
        data={processData}
        columns={columns}
        itemsPerPage={5}
        action
        onDelete={handleDelete} // Implement delete functionality
        onEdit={handleEdit}
        paginationOff
      />
    </div>
  );
};

export default DisplayProcessCat;
