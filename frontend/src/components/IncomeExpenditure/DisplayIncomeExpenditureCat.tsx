import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import IncomeExpenditure from '@/components/IncomeExpenditure/IncomeExpenditure';
import {useAuthContext} from '@/context/AuthContext';
import {
  useDeleteIncomeExpense,
  useGetIncomeExpenseByCaterorId,
} from '@/lib/react-query/queriesAndMutations/cateror/income';
import {useNavigate} from '@tanstack/react-router';

// Define the new type for income and expenditure
type IncomeExpenditure = {
  eventId: string;
  id: string;
  date: string;
  status: string;
  particular: string;
  amount: number;
  event: {
    name: string;
  };
};

// Define the columns for the income and expenditure table
const columns: Column<IncomeExpenditure>[] = [
  {header: 'Date & Time', accessor: 'date', sortable: true},
  {header: 'Income/Expense', accessor: 'status', sortable: true},
  {header: 'Event Name', accessor: 'event', sortable: true},
  {header: 'Particular', accessor: 'particular', sortable: true},
  {header: 'Amount', accessor: 'amount', sortable: true},
];

const DisplayIncomeExpnditureCat: React.FC = () => {
  const {user} = useAuthContext();
  const navigate = useNavigate();

  const {data: IncomeExpenditureResponse} = useGetIncomeExpenseByCaterorId(
    user?.caterorId as string,
  );

  console.log(IncomeExpenditureResponse);

  const {mutate: deleteIncomeExpense} = useDeleteIncomeExpense();

  const data: IncomeExpenditure[] = Array.isArray(IncomeExpenditureResponse)
    ? IncomeExpenditureResponse
    : [];

  const mappedData = data?.map((income: IncomeExpenditure) => ({
    ...income,
    event: income?.event?.name || 'Event Not Assign',
    date: new Date(income.date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }),
  }));
  const handleEdit = (items: IncomeExpenditure) => {
    navigate({
      to: `/update/incomeExpenditure/${items.id}`,
    });
  };

  const handleDelete = (items: IncomeExpenditure) => {
    deleteIncomeExpense(items.id);
  };

  return (
    <GenericTable
      title="Income & Expenditure"
      data={mappedData || []}
      columns={columns}
      itemsPerPage={5}
      action
      onDelete={handleDelete}
      onEdit={handleEdit}
    />
  );
};
export default DisplayIncomeExpnditureCat;
