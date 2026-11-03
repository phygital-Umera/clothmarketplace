/* eslint-disable  */
import React from 'react';
import GenericTable, {Column} from '../Forms/Table/GenericTable';
import {useGetNotification} from '@/lib/react-query/queriesAndMutations/notification';

// Define the columns for the table
const columns: Column<any>[] = [
  {header: 'Dish Name', accessor: 'dishName', sortable: true},
  {
    header: 'Created Date',
    accessor: (row) =>
      new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(row?.createdAt)),
    sortable: true,
  },
];

const DisplayNotificationDishes: React.FC = () => {
  const {data: notificationReponse} = useGetNotification();

  // Filter data where caterorId is null
  const filteredData =
    notificationReponse?.filter((item) => item.caterorId === null) || [];

  console.log('Filtered Data:', filteredData);

  return (
    <div className="flex flex-col">
      <GenericTable
        title="Notification Dishes"
        data={filteredData} // Pass the filtered data
        columns={columns}
        itemsPerPage={20}
        searchAble
        action
        onEdit={() => {}}
        onDelete={() => {}}
      />
    </div>
  );
};

export default DisplayNotificationDishes;
