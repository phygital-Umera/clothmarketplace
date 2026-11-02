import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import IncomeExpenditure from '@/components/IncomeExpenditure/IncomeExpenditure';
import {useAuthContext} from '@/context/AuthContext';
import {
  useDeleteIncomeExpense,
  useGetIncomeExpenseByCaterorId,
} from '@/lib/react-query/queriesAndMutations/cateror/income';
import {useGetIncomeAndExpenditure} from '@/lib/react-query/queriesAndMutations/cateror/income&expenditure';
import {useNavigate} from '@tanstack/react-router';
import {Route} from '@/routes/_app/_event/events.$id';

// Define the new type for income and expenditure
type IncomeExpenditure = {
  eventId: string;
  id: string;
  date: string;
  status: string;
  particular: string;
  amount: number;
};

// Define the columns for the income and expenditure table
const columns: Column<IncomeExpenditure>[] = [
  {header: 'Date & Time', accessor: 'date', sortable: true},
  {header: 'Income/Expense', accessor: 'status', sortable: true},
  // {header: 'Head', accessor: 'Head', sortable: true},
  {header: 'Particular', accessor: 'particular', sortable: true},
  {header: 'Amount', accessor: 'amount', sortable: true},
];

const DisplayIncomeExpnditure: React.FC = () => {
  const {user} = useAuthContext();
  const {id: EventId} = Route.useParams();
  const navigate = useNavigate();

  const {data: IncomeExpenditureResponse} = useGetIncomeExpenseByCaterorId(
    user?.caterorId as string,
  );

  const data: IncomeExpenditure[] = Array.isArray(IncomeExpenditureResponse)
    ? IncomeExpenditureResponse
    : [];

  const mappedData = data
    ?.filter((item: IncomeExpenditure) => item.eventId === EventId)
    ?.map((income: IncomeExpenditure) => ({
      ...income,
      date: new Date(income.date).toLocaleDateString(),
    }));
  const handleEdit = (items: IncomeExpenditure) => {
    navigate({
      to: `/update/incomeExpenditure/${items.id}`,
    });
  };

  const {mutateAsync: deleteIncomeExpense} = useDeleteIncomeExpense();

  const handleDelete = async (items: IncomeExpenditure) => {
    await deleteIncomeExpense(items.id);
  };

  return (
    <GenericTable
      data={mappedData || []}
      columns={columns}
      itemsPerPage={5}
      action
      onDelete={handleDelete}
      onEdit={handleEdit}
    />
  );
};
export default DisplayIncomeExpnditure;
