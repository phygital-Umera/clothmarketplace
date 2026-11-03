import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';
import React from 'react';

// Define the new type for the income head
type IncomeHead = {
  Head: string;
  IncomeExpenditure: string;
};

// Sample data for income heads
const incomeHeads: IncomeHead[] = [
  {
    Head: 'Salary',
    IncomeExpenditure: 'Income',
  },
  {
    Head: 'Rent',
    IncomeExpenditure: 'Expenditure',
  },
];

// Define the columns for the income head table
const columns: Column<IncomeHead>[] = [
  {header: 'Head', accessor: 'Head', sortable: true},
  {header: 'Income/Expenditure', accessor: 'IncomeExpenditure', sortable: true},
];

const DisplayIncomeExpenditureHead: React.FC = () => {
  const navigate = useNavigate();

  const handleEdit = (items: IncomeHead) => {
    navigate({
      to: `/update/incomeexpenditurehead/${items.Head}`,
    });
  };
  return (
    <GenericTable
      data={incomeHeads}
      columns={columns}
      itemsPerPage={5}
      action
      onDelete={() => {}}
      onEdit={handleEdit}
    />
  );
};
export default DisplayIncomeExpenditureHead;
