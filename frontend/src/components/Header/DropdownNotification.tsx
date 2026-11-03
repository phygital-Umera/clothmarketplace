/* eslint-disable*/
import {useState} from 'react';
import {Link, useNavigate} from '@tanstack/react-router';
import ClickOutside from '../ClickOutside';
import {useGetAmountNotificationById} from '@/lib/react-query/queriesAndMutations/notification';
import {useAuthContext} from '@/context/AuthContext';

const DropdownNotification = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifying, setNotifying] = useState(true);
  const {user} = useAuthContext();
  const id = user?.caterorId ?? '';
  const navigate = useNavigate();
  const {data: notificationReponse} = useGetAmountNotificationById(id);
  console.log('====================================');
  console.log(notificationReponse);
  console.log('====================================');

  const formatIndianDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getNotificationType = (notification: any) => {
    if (notification.amount) return 'Payment Update';
    if (notification.dishName) return 'New Dish Added';
    return 'General Notification';
  };

  const getNotificationIcon = (notification: any) => {
    if (notification.amount) return '💰';
    if (notification.dishName) return '🍲';
    return '🔔';
  };

  return (
    <ClickOutside onClick={() => setDropdownOpen(false)} className="relative">
      <li className="relative">
        <Link
          onClick={() => {
            setNotifying(false);
            setDropdownOpen(!dropdownOpen);
          }}
          className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-stroke bg-gray hover:text-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
        >
          <span
            className={`absolute -top-0.5 right-0 z-1 h-2 w-2 rounded-full bg-meta-1 ${
              notifying === false ? 'hidden' : 'inline'
            }`}
          >
            <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75"></span>
          </span>

          <svg
            className="fill-current duration-300 ease-in-out"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16.1999 14.9343L15.6374 14.0624C15.5249 13.8937 15.4687 13.7249 15.4687 13.528V7.67803C15.4687 6.01865 14.7655 4.47178 13.4718 3.31865C12.4312 2.39053 11.0812 1.7999 9.64678 1.6874V1.1249C9.64678 0.787402 9.36553 0.478027 8.9999 0.478027C8.6624 0.478027 8.35303 0.759277 8.35303 1.1249V1.65928C8.29678 1.65928 8.24053 1.65928 8.18428 1.6874C4.92178 2.05303 2.4749 4.66865 2.4749 7.79053V13.528C2.44678 13.8093 2.39053 13.9499 2.33428 14.0343L1.7999 14.9343C1.63115 15.2155 1.63115 15.553 1.7999 15.8343C1.96865 16.0874 2.2499 16.2562 2.55928 16.2562H8.38115V16.8749C8.38115 17.2124 8.6624 17.5218 9.02803 17.5218C9.36553 17.5218 9.6749 17.2405 9.6749 16.8749V16.2562H15.4687C15.778 16.2562 16.0593 16.0874 16.228 15.8343C16.3968 15.553 16.3968 15.2155 16.1999 14.9343ZM3.23428 14.9905L3.43115 14.653C3.5999 14.3718 3.68428 14.0343 3.74053 13.6405V7.79053C3.74053 5.31553 5.70928 3.23428 8.3249 2.95303C9.92803 2.78428 11.503 3.2624 12.6562 4.2749C13.6687 5.1749 14.2312 6.38428 14.2312 7.67803V13.528C14.2312 13.9499 14.3437 14.3437 14.5968 14.7374L14.7655 14.9905H3.23428Z"
              fill=""
            />
          </svg>
        </Link>

        {dropdownOpen && (
          <div className="absolute -right-27 mt-2.5 w-80 rounded-lg border border-stroke bg-white shadow-xl dark:border-strokedark dark:bg-boxdark sm:right-0">
            <div className="sticky top-0 z-10 border-b border-stroke bg-white px-4 py-3 dark:border-strokedark dark:bg-boxdark">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-semibold text-bodydark2">
                  Notifications
                </h5>
                <span className="text-gray-500 text-xs">
                  {notificationReponse?.length || 0} new
                </span>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notificationReponse?.length ? (
                notificationReponse.map((item: any, index: number) => (
                  <div
                    key={item.id ? item.id : `${item.date}-${index}`}
                    className="hover:bg-gray-50 border-b border-stroke px-4 py-3 dark:border-strokedark dark:hover:bg-meta-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm">
                        {getNotificationIcon(item)}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-black dark:text-white">
                            {getNotificationType(item)}
                          </h4>
                          <span className="text-gray-500 text-xs">
                            {formatIndianDate(item.date)}
                          </span>
                        </div>

                        <div className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
                          {item.eventName && (
                            <p className="truncate">Event: {item.eventName}</p>
                          )}
                          {item.amount && (
                            <p>
                              Amount: ₹
                              {Number(item.amount).toLocaleString('en-IN')}
                            </p>
                          )}
                          {item.clientName && (
                            <p className="truncate">
                              Client: {item.clientName}
                            </p>
                          )}
                          {item.particular && (
                            <p className="truncate">
                              Details: {item.particular}
                            </p>
                          )}
                          {item.particular && (
                            <p className="truncate rounded bg-primary/10 px-1">
                              Client Number: {item.clientNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <svg
                    className="text-gray-400 h-12 w-12"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                    No new notifications
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </li>
    </ClickOutside>
  );
};

export default DropdownNotification;
