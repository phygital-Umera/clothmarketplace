import {useAuthContext} from '@/context/AuthContext';
import {useGetIncomeExpenseByCaterorId} from '@/lib/react-query/queriesAndMutations/cateror/income';
import React from 'react';
import GenericTable, {Column} from '../Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';

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

const DisplayIncomeExpenseCat: React.FunctionComponent<{status: string}> = (
  props,
) => {
  const {status} = props;
  const navigate = useNavigate();
  const {user} = useAuthContext();

  const {data: incomeExpense} = useGetIncomeExpenseByCaterorId(
    user?.caterorId as string,
  );

  const data: DisplayIncomeExpenseType[] = Array.isArray(incomeExpense)
    ? incomeExpense
    : [];

  const filteredData = data
    ?.filter((item: DisplayIncomeExpenseType) => item.status === status)
    .map((item: DisplayIncomeExpenseType) => ({
      ...item,
      date: new Date(item.date).toLocaleDateString(),
      status: item.status,
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
      // onDelete={() => {}}
      onEdit={handleEdit}
    />
  );
};

export default DisplayIncomeExpenseCat;
