import axios, {AxiosError} from 'axios';
import {jwtDecode} from 'jwt-decode';

/*
 * One API client for the store. The backend wraps every reply as
 * {statusCode, data, message}; `get`/`post`… return `data`.
 */

export const API_URL = (import.meta.env.VITE_SERVER_URL as string).replace(/\/$/, '');
const TOKEN_KEY = 'clothpro.store.token';

export type Tokens = {accessToken: string; refreshToken: string};

export const tokens = {
  read: (): Tokens | null => {
    try {
      return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
    } catch {
      return null;
    }
  },
  write: (t: Tokens) => localStorage.setItem(TOKEN_KEY, JSON.stringify(t)),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const http = axios.create({baseURL: API_URL});

let refreshing: Promise<Tokens> | null = null;
const refresh = async (refreshToken: string) => {
  const res = await axios.post(`${API_URL}/users/refresh`, {refreshToken});
  const next = res.data.data as Tokens;
  tokens.write(next);
  return next;
};

/** Called when the session can't be renewed (set by the auth provider) */
let onSignedOut: () => void = () => {};
export const setSignedOutHandler = (fn: () => void) => {
  onSignedOut = fn;
};

http.interceptors.request.use(async (req) => {
  let t = tokens.read();
  if (!t?.accessToken) return req;
  const {exp} = jwtDecode<{exp?: number}>(t.accessToken);
  if (exp && exp * 1000 < Date.now() + 10_000 && t.refreshToken) {
    try {
      refreshing ??= refresh(t.refreshToken);
      t = await refreshing;
    } catch {
      tokens.clear();
      onSignedOut();
      return req;
    } finally {
      refreshing = null;
    }
  }
  req.headers.Authorization = `Bearer ${t.accessToken}`;
  return req;
});

http.interceptors.response.use(undefined, (error: AxiosError) => {
  if (error.response?.status === 401 && tokens.read()) {
    tokens.clear();
    onSignedOut();
  }
  return Promise.reject(error);
});

type Body = {data: unknown};
const unwrap = <T>(p: Promise<{data: Body}>) => p.then((r) => r.data.data as T);

export const api = {
  get: <T>(url: string, params?: object) => unwrap<T>(http.get(url, {params})),
  post: <T>(url: string, body?: object, params?: object) => unwrap<T>(http.post(url, body, {params})),
  patch: <T>(url: string, body?: object) => unwrap<T>(http.patch(url, body)),
  del: <T>(url: string, params?: object) => unwrap<T>(http.delete(url, {params})),
};

/** The backend's message for a failed request, with field errors when given */
export const errorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.') => {
  if (error instanceof AxiosError) {
    if (!error.response) return 'Cannot reach the store right now. Check your internet and try again.';
    const body = error.response.data as {message?: string; errors?: {field: string; message: string}[]} | undefined;
    if (body?.errors?.length && body.message === 'Validation failed') return body.errors[0].message;
    return body?.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export const fieldErrors = (error: unknown): Record<string, string> => {
  if (!(error instanceof AxiosError)) return {};
  const errs = (error.response?.data as {errors?: {field: string; message: string}[]} | undefined)?.errors ?? [];
  return Object.fromEntries(errs.map((e) => [e.field, e.message]));
};
