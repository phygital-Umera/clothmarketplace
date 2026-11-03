import {api} from '@/utils/axios';
import {ApiResponse} from '@/types';
import {
  Company,
  CompanyList,
  CompanyListParams,
  CompanyPayload,
} from '@/types/company';

// The response interceptor already unwraps axios' `res.data`
type Res<T> = Promise<ApiResponse<T>>;

const toFormData = ({values, logo, removeLogo}: CompanyPayload) => {
  const form = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    // Never send the string "undefined" for optional fields
    if (value !== undefined && value !== null) form.append(key, value);
  });
  if (logo) form.append('logo', logo);
  if (removeLogo) form.append('removeLogo', 'true');
  return form;
};

export const getCompanies = (params: CompanyListParams) =>
  api.get('/companies', {params}) as unknown as Res<CompanyList>;

export const getCompany = (id: string) =>
  api.get(`/companies/${id}`) as unknown as Res<Company>;

export const createCompany = (payload: CompanyPayload) =>
  api.post('/companies', toFormData(payload)) as unknown as Res<Company>;

export const updateCompany = ({
  id,
  ...payload
}: CompanyPayload & {id: string}) =>
  api.patch(`/companies/${id}`, toFormData(payload)) as unknown as Res<Company>;

export const deleteCompany = (id: string) =>
  api.delete(`/companies/${id}`) as unknown as Res<object>;
