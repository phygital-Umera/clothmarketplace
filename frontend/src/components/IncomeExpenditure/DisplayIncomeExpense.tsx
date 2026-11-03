import {useAuthContext} from '@/context/AuthContext';
import {useGetIncomeExpenseByCaterorId} from '@/lib/react-query/queriesAndMutations/cateror/income';
import React from 'react';
import GenericTable, {Column} from '../Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';
import {Route} from '@/routes/_app/_event/events.$id';
import {useGetQuatation} from '@/lib/react-query/queriesAndMutations/cateror/quatation';

interface DisplayIncomeExpenseType {
  id: string;
  status: string;
  particular: string;
  amount: number;
  date: string;
  eventId: string;
}

const columns: Column<DisplayIncomeExpenseType>[] = [
  {header: 'Date', accessor: 'date', sortable: true},
  {header: 'Particular', accessor: 'particular', sortable: true},
  {header: 'Amount', accessor: 'amount', sortable: true},
];

const DisplayIncomeExpense: React.FunctionComponent<{status: string}> = (
  props,
) => {
  const {status} = props;
  const navigate = useNavigate();
  const {id: EventId} = Route.useParams();

  const {user} = useAuthContext();

  const {data: incomeExpense} = useGetIncomeExpenseByCaterorId(
    user?.caterorId as string,
  );

  console.log('incomeExpense:: ', incomeExpense);

  const {data: quatation} = useGetQuatation(EventId);
  console.log('quatation:: ', quatation);

  const data: DisplayIncomeExpenseType[] = Array.isArray(incomeExpense)
    ? incomeExpense
    : [];

  // Filter data for Receivable status and map event name to particular
  const filteredData = data
    ?.filter(
      (item: DisplayIncomeExpenseType) =>
        item.status === status && item.eventId === EventId,
    )
    .map((item: DisplayIncomeExpenseType) => ({
      ...item,
      date: new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
      }).format(new Date(item.date)),
      amount: quatation?.event?.balance || item.amount,
    }));

  const handleEdit = (items: DisplayIncomeExpenseType) => {
    navigate({
      to: `/update/incomeExpenditure/${items.id}`,
    });
  };

  return (
    <GenericTable
      title={status
        .charAt(0)
        .toUpperCase()
        .concat(status.substring(1, status.length).toLowerCase())}
      data={filteredData || []}
      columns={columns}
      itemsPerPage={5}
      action
      onEdit={handleEdit}
    />
  );
};

export default DisplayIncomeExpense;
