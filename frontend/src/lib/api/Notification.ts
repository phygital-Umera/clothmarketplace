import {api} from '@/utils/axios';
import {AxiosError} from 'axios';

const getNotification = async () => {
  try {
    const res = await api.get('/notifications');
    return res.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.message || 'Failed to get Notifications',
      );
    }
    throw error;
  }
};

const getAmountNotification = async (id: string) => {
  console.log('id', id);
  try {
    const res = await api.get(`cateror/cateror/notification/${id}`);
    return res.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.message || 'Failed to get Notifications',
      );
    }
    throw error;
  }
};

const getNotificationById = async (id: string) => {
  console.log('id', id);

  try {
    const res = await api.get(`/showDishById/${id}`);
    return res.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.data?.message || 'Failed to get Notification',
      );
    }
    throw error;
  }
};

export {getNotification, getNotificationById, getAmountNotification};
