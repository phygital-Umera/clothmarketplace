import {
  useDeleteSubEvent,
  useGetSubevent,
} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {subEventValidationSchema} from '@/lib/validation/eventSchema';
import {Route} from '@/routes/_app/_event/events.$id';
import {useNavigate} from '@tanstack/react-router';
import React from 'react';
import {BiEditAlt, BiQr} from 'react-icons/bi';
import {FiDelete} from 'react-icons/fi';
import {MdDeleteSweep} from 'react-icons/md';
import z from 'zod';

type SubEventType = z.infer<typeof subEventValidationSchema>;

const SubEventList: React.FunctionComponent = () => {
  const {id: EventId} = Route.useParams();
  const navigate = useNavigate();
  const {data: subEventResponse} = useGetSubevent(EventId);

  const {mutateAsync: deleteSubEvent} = useDeleteSubEvent();

  const mappedSubEvents =
    subEventResponse?.data.subEvents
      ?.map((subEvent) => ({
        ...subEvent,
        SubEventName: subEvent.name,
        Time: new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(new Date(subEvent.time)),
        StartDate: new Intl.DateTimeFormat('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(new Date(subEvent.date)),
      }))
      ?.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return new Date(a.time).getTime() - new Date(b.time).getTime();
      }) || [];

  const handleEditSubEvent = (id: string) => {
    navigate({
      to: `/update-subevent/${id}`,
    });
  };

  const handleGenerateQR = (id: string) => {
    navigate({
      to: `/qrgenerator/${id}`,
    });
  };

  const handleDeleteSubEvent = async (id: string) => {
    await deleteSubEvent(id);
  };

  return (
    <div className="">
      <h2 className="mb-6 bg-gray-2 p-4 text-xl font-semibold dark:bg-meta-4">
        Sub Events List
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full dark:divide-graydark">
          <thead className="bg-gray-50 bg-gray-2 dark:bg-meta-4">
            <tr>
              <th className="text-gray-500 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Date
              </th>
              <th className="text-gray-500 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Time
              </th>
              <th className="text-gray-500 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Sub Event
              </th>
              <th className="text-gray-500 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Expected People
              </th>
              <th className="text-gray-500 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                QR Code
              </th>
              <th className="text-gray-500 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-gray-200 bg-transparent">
            {mappedSubEvents.map((subEvent) => (
              <tr key={subEvent.id} className="hover:bg-gray-50">
                <td className="text-gray-500 whitespace-nowrap px-6 py-4 text-sm">
                  {subEvent.StartDate}
                </td>
                <td className="text-gray-500 whitespace-nowrap px-6 py-4 text-sm">
                  {subEvent.Time}
                </td>
                <td className="text-gray-500 whitespace-nowrap px-6 py-4 text-sm">
                  {subEvent.SubEventName}
                </td>
                <td className="text-gray-500 whitespace-nowrap px-6 py-4 text-sm">
                  {subEvent.expectedPeople}
                </td>
                <td className="text-gray-500 whitespace-nowrap px-6 py-4 text-sm">
                  <button
                    onClick={() => handleGenerateQR(subEvent.id)}
                    className="text-gray-600 flex items-center justify-center rounded-md p-2 hover:bg-indigo-50 hover:text-indigo-900"
                    title="Generate QR Code"
                  >
                    <BiQr size={20} />
                  </button>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                  <button
                    onClick={() => handleEditSubEvent(subEvent.id)}
                    className="text-gray-600 mr-4 hover:text-indigo-900"
                  >
                    <BiEditAlt size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteSubEvent(subEvent.id)}
                    className="text-gray-600 hover:text-red-900"
                  >
                    <MdDeleteSweep size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SubEventList;
