import {useMutation} from '@tanstack/react-query';
import {
  changeCurrentPassword,
  loginUser,
  registerUser,
  requestResetPassword,
  resetPassword,
} from '@/lib/api/Auth/auth';

// Pages show these errors inline next to the form, so no error toasts here

const useLoginUser = () => useMutation({mutationFn: loginUser});

/** Public sign-up (CUSTOMER) */
const useRegisterUser = () => useMutation({mutationFn: registerUser});

const useChangeCurrentPassword = () =>
  useMutation({mutationFn: changeCurrentPassword});

const useRequestResetPassword = () =>
  useMutation({mutationFn: requestResetPassword});

const useResetPassword = () => useMutation({mutationFn: resetPassword});

export {
  useLoginUser,
  useRegisterUser,
  useChangeCurrentPassword,
  useRequestResetPassword,
  useResetPassword,
};
