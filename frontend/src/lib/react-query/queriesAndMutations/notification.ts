import {useQuery} from '@tanstack/react-query';
import {NOTIFICATION_QUERY_KEYS} from '../queryKeys';
import {
  getAmountNotification,
  getNotification,
  getNotificationById,
} from '@/lib/api/Notification';

const useGetNotification = () => {
  return useQuery({
    queryKey: [NOTIFICATION_QUERY_KEYS.GET_NOTIFICATION],
    queryFn: () => getNotification(),
  });
};

const useGetNotificationById = (id: string) => {
  return useQuery({
    queryKey: ['notificationById', id],
    queryFn: () => getNotificationById(id),
  });
};
const useGetAmountNotificationById = (id: string) => {
  return useQuery({
    queryKey: ['notificationById', id],
    queryFn: () => getAmountNotification(id),
  });
};

export {
  useGetNotification,
  useGetNotificationById,
  useGetAmountNotificationById,
};
