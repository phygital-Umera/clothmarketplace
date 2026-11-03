import {useEffect, useState} from 'react';
import {useNavigate} from '@tanstack/react-router';
import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {
  useDeleteProcess,
  useGetProcesses,
} from '@/lib/react-query/queriesAndMutations/admin/process';
import {Process as APIProcess} from '@/types/admin';

type Process = APIProcess;

const columns: Column<Process>[] = [
  {header: 'Process Name', accessor: 'name', sortable: true}, // Accessor should match the actual field ('name')
];

const DisplayProcess: React.FC = () => {
  const navigate = useNavigate();
  const [processData, setProcessData] = useState<Process[]>([]);
  const {mutate: deleteProcess} = useDeleteProcess();

  // Fetch processes from the API
  const {
    data: processesApiData,
    error,
    isLoading: isLoadingProcesses,
  } = useGetProcesses();

  // Update state with the fetched processes
  useEffect(() => {
    if (processesApiData?.processes) {
      setProcessData(processesApiData.processes as Process[]); // Cast to Process[] type if necessary
    } else if (error) {
      console.error('Error fetching processes:', error);
    }
  }, [processesApiData, error]);

  // Handle edit functionality
  const handleEdit = (item: Process) => {
    navigate({
      to: `/update/process/${item.id}`, // Use the process ID for the route
    });
  };

  // Handle delete functionality
  const handleDelete = (item: Process) => {
    deleteProcess(item.id); // Call the mutation to delete the process by ID
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
        searchAble
        action
        onDelete={handleDelete} // Implement delete functionality
        onEdit={handleEdit}
      />
    </div>
  );
};

export default DisplayProcess;
