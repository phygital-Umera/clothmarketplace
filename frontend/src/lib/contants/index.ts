import {AuthContextType} from '@/types';

export const INITIAL_AUTH_STATE: AuthContextType = {
  user: null,
  setUser: () => {},
  role: null,
  setRole: () => {},
  token: null,
  setToken: () => {},
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  isSuperAdmin: false,
  isCompanyAdmin: false,
  login: () => {},
  logout: () => {},
};

export const languageId = localStorage.getItem('languageId');
export const caterorId = localStorage.getItem('caterorId');
export const DEFAULT_LANGUAGE_ID = 'en';
export const DEFAULT_PEOPLE_COUNT = 0;
export const DEFAULT_PRICE = 0;
export const DEFAULT_KG = 0;
