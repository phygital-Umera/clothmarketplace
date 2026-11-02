/* eslint-disable  */
import {confirmAlert} from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import {useInvoice} from '@/context/InvoiceContext';
import {
  useDeleteEvent,
  useGetAllEvents,
} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {useNavigate} from '@tanstack/react-router';
import {
  addDays,
  addMonths,
  differenceInDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isEqual,
  isSameDay,
  isToday,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {useEffect, useMemo, useState} from 'react';
// import toast from 'react-hot-toast';
import {FaAngleLeft, FaAngleRight, FaStar} from 'react-icons/fa6';
import EventModal from '../Event/EventModal';
import ExpiryPopup from './ExpiryPopup';
import {MdDelete, MdEdit} from 'react-icons/md';
import UpdateEventModal from '../Event/UpdateEventModal';

interface IEventTypes {
  EventID: string;
  StartDate: string;
  EndDate: string;
  EventName: string;
  status: string;
  isPremium: boolean;
}

const statusColorMap = {
  ENQUIRY: 'bg-[#87CEEB] dark:bg-[#87CEEB]', // Faint Blue, Dark Blue
  FINALIZED: 'bg-[#FF1493] dark:bg-[#FF1493]', // Teal
  PREPARATION: 'bg-[#0097A7] dark:bg-[#0097A7]', // Dark Pink
  PAID: 'bg-[#32CD32] dark:bg-[#2E8B57]', // Green
};

const Calendar = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPopup, setIsPopup] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  const startOfMonthDate = startOfMonth(currentMonth);
  const endOfMonthDate = endOfMonth(currentMonth);
  const startWeekDate = startOfWeek(startOfMonthDate);
  const endWeekDate = endOfWeek(endOfMonthDate);
  const days = eachDayOfInterval({start: startWeekDate, end: endWeekDate});

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<IEventTypes | null>(null);

  const {data, isSuccess, refetch} = useGetAllEvents();
  const {
    mutateAsync: deleteEvent,
    isSuccess: isDeleteSuccess,
    isError,
  } = useDeleteEvent();
  const {generateInvoices} = useInvoice();

  useEffect(() => {
    if (isDeleteSuccess) {
      // toast.success('Event deleted successfully');
      refetch();
    }
    if (isError) {
      // toast.success('Event deletion failed');
      refetch();
    }
  }, [isDeleteSuccess, isError]);

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    event: IEventTypes | null;
  }>({visible: false, x: 0, y: 0, event: null});

  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.visible) {
        setContextMenu((prev) => ({...prev, visible: false}));
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [contextMenu.visible]);

  const handlePopupClose = () => {
    setIsPopup(false);
  };

  const events = data?.data?.events.map(
    (event: {id: number; name: string}) => ({
      id: event.id,
      name: event.name,
    }),
  );

  useEffect(() => {
    generateInvoices(events);
  }, [data]);

  useEffect(() => {
    if (data?.data?.expiry?.expiryDate) {
      const expiryDate = new Date(data.data.expiry.expiryDate);
      const currentDate = new Date();
      const differenceInDays = Math.floor(
        (expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (differenceInDays <= 6 && differenceInDays >= 0) {
        setIsPopup(true);
        setDaysRemaining(differenceInDays);
      } else {
        setIsPopup(false);
        setDaysRemaining(null);
      }
    }
  }, [data]);

  const loadEventDates: IEventTypes[] = useMemo(() => {
    return (
      data?.data?.events.map(
        (event: {
          id: string;
          name: string;
          startDate: string;
          endDate: string;
          status: string;
        }) => {
          const {id, name, startDate, endDate, status} = event;

          return {
            EventID: id,
            StartDate: startDate.split('T')[0],
            EndDate: endDate.split('T')[0],
            EventName: name,
            status: status?.toUpperCase(),
            isPremium: name.toLowerCase().includes('premium'),
          };
        },
      ) || []
    );
  }, [data]);

  const eventsInCurrentMonth = useMemo(() => {
    const currentMonthStart = startOfMonth(currentMonth);
    const currentMonthEnd = endOfMonth(currentMonth);

    return loadEventDates.filter((event) => {
      const eventStart = new Date(event.StartDate);
      const eventEnd = new Date(event.EndDate);
      return eventStart <= currentMonthEnd && eventEnd >= currentMonthStart;
    });
  }, [loadEventDates, currentMonth]);

  const navigateToEvents = (path: string) => navigate({to: path});

  const addEventHandler = (date: Date) => {
    setSelectedDate(date);
    if (isBefore(date, new Date()) && !isToday(date)) {
      // toast.error('You cannot create an event on past dates.');
      return;
    }
    setIsModalOpen(true);
  };

  const addDatesToLocalStorage = (startDate: string, endDate: string) => {
    localStorage.setItem('startDate', startDate);
    localStorage.setItem('endDate', endDate);
  };

  // Function to organize events by week and position
  const organizeEventsByWeek = (weekStart: Date, weekEnd: Date) => {
    // Filter events that fall within this week
    const eventsInWeek = eventsInCurrentMonth.filter((event) => {
      const eventStart = new Date(event.StartDate);
      const eventEnd = new Date(event.EndDate);
      return eventStart <= weekEnd && eventEnd >= weekStart;
    });

    // Sort events by start date and duration
    eventsInWeek.sort((a, b) => {
      const aStart = new Date(a.StartDate);
      const bStart = new Date(b.StartDate);
      if (aStart.getTime() !== bStart.getTime()) {
        return aStart.getTime() - bStart.getTime();
      }

      // If start dates are the same, sort by duration (longer events first)
      const aEnd = new Date(a.EndDate);
      const bEnd = new Date(b.EndDate);
      return differenceInDays(bEnd, bStart) - differenceInDays(aEnd, aStart);
    });

    // Assign row positions to events
    const eventRows: {[key: string]: number} = {};
    let maxRow = -1;

    eventsInWeek.forEach((event) => {
      // Find the first available row
      let rowToUse = 0;
      while (true) {
        let rowTaken = false;

        // Check if this row is occupied by any existing event
        for (const existingEventId in eventRows) {
          if (eventRows[existingEventId] === rowToUse) {
            const existingEvent = eventsInWeek.find(
              (e) => e.EventID === existingEventId,
            );
            if (!existingEvent) continue;

            const existingStart = new Date(existingEvent.StartDate);
            const existingEnd = new Date(existingEvent.EndDate);
            const newStart = new Date(event.StartDate);
            const newEnd = new Date(event.EndDate);

            // Check for overlap in date ranges
            if (newStart <= existingEnd && newEnd >= existingStart) {
              rowTaken = true;
              break;
            }
          }
        }

        if (!rowTaken) break;
        rowToUse++;
      }

      eventRows[event.EventID] = rowToUse;
      maxRow = Math.max(maxRow, rowToUse);
    });

    return {events: eventsInWeek, eventRows, maxRow};
  };

  // Function to render the events for a week
  const renderEventsForWeek = (weekDays: Date[]) => {
    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];

    const {events, eventRows, maxRow} = organizeEventsByWeek(
      weekStart,
      weekEnd,
    );

    // Height per row
    const rowHeight = 24; // pixels

    return events.map((event) => {
      const eventStart = new Date(event.StartDate);
      const eventEnd = new Date(event.EndDate);

      // Find the start and end columns in this week
      let startCol = weekDays.findIndex(
        (day) =>
          day.getDate() === eventStart.getDate() &&
          day.getMonth() === eventStart.getMonth() &&
          day.getFullYear() === eventStart.getFullYear(),
      );

      if (startCol === -1) {
        // Event starts before this week
        startCol = 0;
      }

      let endCol = weekDays.findIndex(
        (day) =>
          day.getDate() === eventEnd.getDate() &&
          day.getMonth() === eventEnd.getMonth() &&
          day.getFullYear() === eventEnd.getFullYear(),
      );

      if (endCol === -1) {
        // Event ends after this week
        endCol = 5;
      }

      // Calculate span
      const colSpan = endCol - startCol + 1;

      // Get row for this event
      const rowPosition = eventRows[event.EventID];

      // Styling
      const eventColor =
        statusColorMap[event.status as keyof typeof statusColorMap] ||
        'bg-gray-300';

      return (
        <div
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({
              visible: true,
              x: e.pageX,
              y: e.pageY,
              event,
            });
          }}
          key={`week-${weekStart.toISOString()}-event-${event.EventID}`}
          className={`absolute ${eventColor} group z-10 mt-2 cursor-pointer rounded-sm px-1`}
          style={{
            left: `${(startCol * 100) / 7}%`,
            width: `${(colSpan * 100) / 7}%`,
            top: `calc(25px + ${rowPosition * rowHeight}px)`, // 25px for the date number plus row position
            height: `${rowHeight - 4}px`, // Small gap between rows
          }}
          onClick={(e) => {
            e.stopPropagation();
            navigateToEvents(`/events/${event.EventID}`);
            addDatesToLocalStorage(event.StartDate, event.EndDate);
          }}
        >
          <p className="truncate text-xs text-white">
            {event.EventName}
            {event.isPremium && (
              <FaStar className="ml-1 inline text-yellow-500" size={10} />
            )}
          </p>

          {/* Tooltip on hover */}
          <div className="border-gray-200 dark:border-gray-600 dark:bg-gray-700 absolute left-0 top-full z-50 hidden min-w-[200px] rounded-md border bg-white p-2 shadow-lg group-hover:block">
            <p className="text-gray-800 text-sm font-semibold dark:text-graydark">
              {event.EventName}
              {event.isPremium && (
                <FaStar className="ml-1 inline text-yellow-500" />
              )}
            </p>
            <p className="text-gray-600 text-xs dark:text-graydark">
              {format(new Date(event.StartDate), 'MMM-d-yyyy hh:mm a')}
              {format(new Date(event.EndDate), 'MMM d, yyyy hh:mm a')}
            </p>
            <p className="text-gray-600 text-xs dark:text-graydark">
              Status: {event.status}
            </p>
          </div>
        </div>
      );
    });
  };

  return (
    <>
      {/* <h1 className="mb-4 p-4 text-2xl font-bold">Event Calendar</h1> */}
      <div className="w-full max-w-full rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <header className="flex items-center justify-between bg-primary p-4 text-white">
          <button onClick={handlePrevMonth} className="text-sm">
            <FaAngleLeft />
          </button>
          <h2 className="text-xl font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button onClick={handleNextMonth} className="text-sm">
            <FaAngleRight />
          </button>
        </header>

        <table className="w-full">
          <thead>
            <tr className="grid grid-cols-7 rounded-t-sm bg-primary text-white">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <th
                  key={day}
                  className="flex h-10 items-center justify-center p-1 text-xs font-semibold sm:text-base xl:p-5"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({length: days.length / 7}).map((_, rowIndex) => {
              const weekDays = days.slice(rowIndex * 7, rowIndex * 7 + 7);

              return (
                <tr key={rowIndex} className="relative grid grid-cols-7">
                  {weekDays.map((date, colIndex) => {
                    const isCurrentMonthDay =
                      date.getMonth() === currentMonth.getMonth() &&
                      date.getFullYear() === currentMonth.getFullYear();

                    return (
                      <td
                        key={colIndex}
                        className={`relative h-30 border border-stroke transition duration-500 hover:bg-gray dark:border-strokedark dark:hover:bg-meta-4 md:p-1 ${isToday(date) ? 'bg-slate-100 text-white dark:bg-slate-700' : ''} ${
                          isBefore(date, new Date()) && !isToday(date)
                            ? 'text-gray-500 dark:text-gray-400 bg-gray dark:bg-graydark'
                            : isCurrentMonthDay
                              ? 'text-black dark:text-white'
                              : 'text-gray-400 dark:text-gray-600'
                        }`}
                        onClick={() => {
                          addEventHandler(date);
                        }}
                      >
                        <span
                          className={`font-medium ${
                            isToday(date) && isCurrentMonthDay
                              ? 'flex h-6 w-6 items-center justify-center rounded-full text-xl font-semibold text-blue-500'
                              : ''
                          }`}
                        >
                          {format(date, 'd')}
                        </span>
                      </td>
                    );
                  })}

                  {/* Event layer for this week - positioned absolutely */}
                  {renderEventsForWeek(weekDays)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-center gap-20 text-center">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-3 w-3 rounded-full ${statusColorMap['ENQUIRY']}`}
          ></span>
          <span className="text-[12px]">INQUIRY</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-3 w-3 rounded-full ${statusColorMap['FINALIZED']}`}
          ></span>
          <span className="text-[12px]">FINALIZED</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-3 w-3 rounded-full ${statusColorMap['PREPARATION']}`}
          ></span>
          <span className="text-[12px]">PREPARATION</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-3 w-3 rounded-full ${statusColorMap['PAID']}`}
          ></span>
          <span className="text-[12px]">PAID</span>
        </div>
      </div>

      {isModalOpen && (
        <EventModal
          showModal={isModalOpen}
          selectedDate={selectedDate}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isUpdateModalOpen && eventToEdit && (
        <UpdateEventModal
          showModal={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          eventData={eventToEdit}
        />
      )}

      {isPopup && (
        <ExpiryPopup
          onClose={handlePopupClose}
          daysRemaining={daysRemaining}
          expiryDate={data?.data?.expiry?.expiryDate || null}
        />
      )}
      {contextMenu.visible && contextMenu.event && (
        <div
          className="border-gray-300 fixed z-50 w-40 rounded-md bg-white text-sm shadow-md dark:bg-black dark:text-white"
          style={{top: contextMenu.y, left: contextMenu.x}}
        >
          <button
            className="hover:bg-gray-100 flex w-full items-center px-4 py-2 text-left"
            onClick={() => {
              confirmAlert({
                title: 'Confirm Delete',
                message: `Are you sure you want to delete this event and all related data? This action is permanent and cannot be undone.`,
                buttons: [
                  {
                    label: 'Yes, Delete',
                    onClick: () => {
                      if (contextMenu.event?.EventID) {
                        deleteEvent(contextMenu.event.EventID);
                        setContextMenu((prev) => ({...prev, visible: false}));
                      }
                    },
                  },
                  {
                    label: 'No',
                    onClick: () => {
                      setContextMenu((prev) => ({...prev, visible: false}));
                    },
                  },
                ],
              });
            }}
          >
            <MdDelete className="mr-2 text-graydark dark:text-white" />
            Delete Event
          </button>

          <button
            className="hover:bg-gray-100 flex w-full items-center px-4 py-2 text-left"
            onClick={() => {
              setEventToEdit(contextMenu.event);
              setIsUpdateModalOpen(true);
              setContextMenu((prev) => ({...prev, visible: false}));
            }}
          >
            <MdEdit className="mr-2 text-graydark dark:text-white" />
            Edit
          </button>
        </div>
      )}
    </>
  );
};

export default Calendar;
