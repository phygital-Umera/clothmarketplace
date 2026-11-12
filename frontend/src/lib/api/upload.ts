import {ApiResponse} from '@/types';
import {api} from '@/utils/axios';

/** Staff photo (profile, expense bill): JPG, PNG or WEBP up to 5 MB. Returns its URL. */
export const uploadPhoto = async (file: File) => {
  const form = new FormData();
  form.append('photo', file);
  const res = (await api.post(
    '/users/uploads',
    form,
  )) as unknown as ApiResponse<{url: string}>;
  return res.data.url;
};
