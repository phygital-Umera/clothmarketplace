import {Token, User} from '@/types';
import {QUERY_KEYS} from '@/lib/react-query/queryKeys';
import axios, {AxiosError, AxiosInstance, AxiosResponse} from 'axios';
import {jwtDecode} from 'jwt-decode';

export const unAuthenticatedApi: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL || 'http://localhost:5692/api/v1',
});

export const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL || 'http://localhost:5692/api/v1',
});

const readToken = (): Token | null =>
  JSON.parse(localStorage.getItem(QUERY_KEYS.TOKEN) || 'null');

const endSession = () => {
  localStorage.removeItem(QUERY_KEYS.TOKEN);
  if (!window.location.pathname.startsWith('/signin')) {
    window.location.assign('/signin');
  }
};

// One refresh at a time, shared by every request that finds an expired token
let refreshing: Promise<Token> | null = null;

const refreshTokens = async (refreshToken: string): Promise<Token> => {
  const res = await unAuthenticatedApi.post('/users/refresh', {refreshToken});
  const next: Token = {
    accessToken: res.data.data.accessToken,
    refreshToken: res.data.data.refreshToken,
  };
  localStorage.setItem(QUERY_KEYS.TOKEN, JSON.stringify(next));
  return next;
};

api.interceptors.request.use(async (req) => {
  // Always read the latest token, so login/logout take effect immediately
  let token = readToken();
  if (!token?.accessToken) return req;

  const user: User = jwtDecode(token.accessToken);
  const isExpired = user.exp && user.exp * 1000 < Date.now();

  if (isExpired && token.refreshToken) {
    try {
      refreshing ??= refreshTokens(token.refreshToken);
      token = await refreshing;
    } catch (error) {
      endSession();
      return Promise.reject(error);
    } finally {
      refreshing = null;
    }
  }

  req.headers.Authorization = `Bearer ${token.accessToken}`;

  // Employees use the same shop screens; their API is /employee (the shop API
  // limited to the modules their shop admin gave them)
  if (user.role === 'EMPLOYEE' && req.url?.startsWith('/shop-admin/')) {
    req.url = `/employee/${req.url.slice('/shop-admin/'.length)}`;
  }
  return req;
});

api.interceptors.response.use(
  async (res: AxiosResponse) => {
    return res.data;
  },
  (error: AxiosError<unknown>) => {
    if (error.response?.status === 401) {
      endSession();
    }
    return Promise.reject(error);
  },
);

/** Pull the backend's error message out of an axios error */
export const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | {message?: string; errors?: {message: string}[]}
      | undefined;
    if (data?.errors?.length) return data.errors[0].message;
    if (data?.message) return data.message;
    if (!error.response) return 'Cannot reach the server. Is it running?';
  }
  return error instanceof Error ? error.message : fallback;
};
