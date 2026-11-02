import {api, unAuthenticatedApi} from '@/utils/axios';
import {ApiResponse, Token} from '@/types';
import {AxiosError} from 'axios';

// ** USER / AUTH API ENDPOINTS (backend: /api/v1/users)

type Res<T> = Promise<ApiResponse<T>>;

export type LoginValues = {identifier: string; password: string};

export type RegisterValues = {
  fullname: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

export type ChangePasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ResetPasswordValues = {
  token: string;
  newPassword: string;
  confirmPassword: string;
};

type LoginResponse = Required<Token> & {
  user: {role: string; mustChangePassword: boolean};
};

/** Public sign-up; the backend always creates a CUSTOMER */
const registerUser = (data: RegisterValues) =>
  unAuthenticatedApi
    .post('/users/register', data)
    .then((res) => res.data) as Res<unknown>;

/** Email or phone in one field; the backend matches either */
const loginUser = async ({identifier, password}: LoginValues) => {
  try {
    const res = await unAuthenticatedApi.post('/users/login', {
      username: identifier.trim(),
      password,
    });
    return res.data as ApiResponse<LoginResponse>;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(error.response?.data?.message || 'Failed to sign in');
    }
    throw error;
  }
};

const logoutUser = () => api.post('/users/logout');

const getCurrentUser = () => api.get('/users/me') as unknown as Res<unknown>;

const UpdateUser = (data: {fullname?: string; address?: string}) =>
  api.patch('/users/update', data);

/** Returns new tokens: other devices are signed out, this one stays in */
const changeCurrentPassword = (data: ChangePasswordValues) =>
  api.post('/users/change-password', data) as unknown as Res<Required<Token>>;

const requestResetPassword = (data: {identifier: string}) =>
  unAuthenticatedApi
    .post('/users/forgot-password', data)
    .then((res) => res.data) as Res<object>;

const resetPassword = (data: ResetPasswordValues) =>
  unAuthenticatedApi
    .post('/users/reset-password', data)
    .then((res) => res.data) as Res<object>;

export {
  registerUser,
  loginUser,
  UpdateUser,
  logoutUser,
  changeCurrentPassword,
  resetPassword,
  requestResetPassword,
  getCurrentUser,
};
