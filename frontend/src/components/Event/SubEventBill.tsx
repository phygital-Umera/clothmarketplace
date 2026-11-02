/* eslint-disable  */
import {useUpdateSubeventCost} from '@/lib/react-query/queriesAndMutations/cateror/event';
import React, {ReactNode, useState} from 'react';

type SubEventBillProps = {
  data: unknown;
  refetch: () => void; // Add this line
};

interface SubEventUpdate {
  date: string | number | Date;
  time: string | number | Date;
  address: string;
  name: ReactNode;
  id: string;
  // name: string;
  expectedCost: number;
  expectedPeople: number;
  actualPeople: number;
  dishes: Array<{
    dish: {name: string; category: {name: string}};
    subEventId: string;
  }>;
}

interface QuatationData {
  event: {
    id: string;
    name: string;
    subEvents: SubEventUpdate[];
  };
  totalCost: number;
  discountGiven: number;
}

export const SubEventBill: React.FC<SubEventBillProps> = ({data, refetch}) => {
  const quatationData = data as QuatationData;

  const subEvents = quatationData?.event?.subEvents || [];

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newCost, setNewCost] = useState<string>('');
  const [costOverrides, setCostOverrides] = useState<{[index: number]: number}>(
    {},
  );

  const {mutateAsync: updateQuotation} = useUpdateSubeventCost();

  const getSubEId = (item: SubEventUpdate) => {
    if (item.dishes && item.dishes.length > 0) {
      const ids = item.dishes.map(
        (dish: {subEventId: string}) => dish.subEventId,
      );
      console.log('SubEvent ID:', ids[0]);
    } else {
      console.log('No dishes found.');
    }
  };

  // Begin editing the cost field by setting the editing index and initializing newCost
  const startEditing = (index: number, currentCost: number) => {
    setEditingIndex(index);
    setNewCost(currentCost.toString());
  };

  // Handle cost input changes
  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCost(e.target.value);
  };

  // Finish editing: validate and update cost via API
  const finishEditing = async (index: number, item: SubEventUpdate) => {
    const updatedCost = parseFloat(newCost);
    if (isNaN(updatedCost)) {
      alert('Please enter a valid number.');
      return;
    }

    setCostOverrides({...costOverrides, [index]: updatedCost});
    const subEventId =
      item.dishes && item.dishes.length > 0
        ? item.dishes[0].subEventId
        : item.id;
    try {
      await updateQuotation({subeventId: subEventId, amount: updatedCost});
      console.log('Cost updated for subEvent id:', subEventId);
      refetch(); // Call refetch after successful update
    } catch (error) {
      console.error('Error updating cost:', error);
      alert('Failed to update cost');
    }
    setEditingIndex(null);
    setNewCost('');
  };

  return (
    <div className="mt-2 p-4 dark:text-white">
      <table className="min-w-full table-auto">
        <thead className="min-w-full table-auto bg-gray dark:bg-meta-4">
          <tr className="bg-gray-200 dark:bg-gray-700">
            <th className="px-4 py-2 text-left">Date</th>
            <th className="px-4 py-2 text-left">Sub Event Name</th>
            <th className="px-4 py-2 text-left">Menu</th>
            <th className="px-4 py-2 text-left">People</th>
            <th className="px-4 py-2 text-left">Cost</th>
          </tr>
        </thead>
        <tbody>
          {subEvents.map((item, index) => {
            const currentCost =
              costOverrides[index] !== undefined
                ? costOverrides[index]
                : item.expectedCost;
            const maxPeople = Math.max(item.expectedPeople, item.actualPeople); // Calculate max people

            const eventDate = new Date(item.date).toLocaleDateString();
            const eventTime = new Date(item.time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const eventPlace = item.address || 'N/A'; // fallback if no place provided

            return (
              <React.Fragment key={item.id || index}>
                {/* Info Row (Date, Time, Place) */}
                {/* <tr className="bg-gray-100 dark:bg-gray-800">
                  <td
                    colSpan={4}
                    className="text-gray-700 dark:text-gray-300 px-4 py-2 text-sm"
                  >
                    <strong>Date:</strong> {eventDate} &nbsp;&nbsp;
                    <strong>Time:</strong> {eventTime} &nbsp;&nbsp;
                    <strong>Place:</strong> {eventPlace}
                  </td>
                </tr> */}

                {/* Main Data Row */}
                <tr className="border-gray-200 dark:border-gray-700 border-b">
                  <td className="px-4 py-5 text-sm">
                    {eventDate}
                    <br />
                    {eventTime}
                  </td>
                  <td className="px-4 py-5">
                    {item.name}
                    <br />({eventPlace})
                  </td>
                  <td className="px-4 py-5">
                    {item.dishes &&
                      item.dishes.map((dish: any, i) => (
                        <span key={i} className="block">
                          {dish.dish.name}
                        </span>
                      ))}
                  </td>
                  <td className="px-4 py-5">{maxPeople}</td>
                  <td className="px-4 py-5 pb-2.5 dark:border-strokedark">
                    {editingIndex === index ? (
                      <input
                        type="text"
                        value={newCost}
                        onChange={handleCostChange}
                        onBlur={() => finishEditing(index, item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishEditing(index, item);
                        }}
                        className={`text-gray-900 border-gray-300 dark:border-gray-600 dark:text-800 h-[32px] w-[100px] rounded-md border px-2 py-1 focus:outline-none dark:bg-transparent dark:text-white ${
                          editingIndex === index
                            ? 'focus:border-blue-500 dark:focus:border-blue-400'
                            : 'hover:border-blue-500'
                        }`}
                        autoFocus
                      />
                    ) : (
                      <span
                        onClick={() => startEditing(index, currentCost)}
                        className="text-gray-900 border-gray-300 dark:border-gray-600 dark:bg-gray-800 flex h-[32px] w-[100px] cursor-pointer items-center justify-center rounded-md border px-2 py-1 hover:border-blue-500 dark:text-white"
                      >
                        {currentCost}
                      </span>
                    )}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SubEventBill;
