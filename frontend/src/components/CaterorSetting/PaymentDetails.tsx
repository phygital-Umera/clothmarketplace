import React, {useEffect} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  useAddPaymentDetailsC,
  useGetPaymentDetails,
} from '@/lib/react-query/queriesAndMutations/cateror/paymentdetails';
import {caterorId} from '@/lib/contants';
import {useAuthContext} from '@/context/AuthContext';

// Define payment details schema
const paymentDetailsSchema = z.object({
  AccountHolderName: z.string().min(1, 'Full name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNo: z
    .string()
    .min(9, 'Account number must be at least 9 digits')
    .max(18, 'Account number cannot exceed 18 digits')
    .regex(/^\d+$/, 'Account number must contain only digits'),
  IFSC: z
    .string()
    .min(1, 'IFSC code is required')
    .regex(/^[A-Za-z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'),
  upi: z
    .string()
    .optional()
    .or(
      z
        .string()
        .regex(/^[\w.-]+@[\w]+$/, 'Invalid UPI ID format (e.g., name@upi)'),
    ),
});

type FormValues = z.infer<typeof paymentDetailsSchema>;

const PaymentDetails = () => {
  const {user} = useAuthContext();
  const id = user?.caterorId ?? '';

  const {mutate: addTermAndCondition, isSuccess} = useAddPaymentDetailsC();
  const {data: paymentData} = useGetPaymentDetails(id);
  console.log('====================================');
  console.log(paymentData);
  console.log('====================================');

  const methods = useForm<FormValues>({
    resolver: zodResolver(paymentDetailsSchema),
    defaultValues: {
      AccountHolderName: '',
      bankName: '',
      accountNo: '',
      IFSC: '',
      upi: '',
    },
  });

  useEffect(() => {
    if (paymentData?.data) {
      methods.reset({
        AccountHolderName: paymentData?.data?.AccountHolderName || '',
        bankName: paymentData?.data.BankName,
        accountNo: paymentData?.data.AccountNo,
        IFSC: paymentData?.data?.IFSC,
        upi: paymentData?.data?.upi || '',
      });
    }
  }, [paymentData, isSuccess, methods]);

  const onSubmit = (data: FormValues) => {
    if (!caterorId) {
      console.error('Cateror ID is missing');
      return;
    }

    addTermAndCondition({
      id: caterorId,
      data: {
        caterorId: caterorId,
        BankName: data.bankName,
        AccountNo: data.accountNo,
        AccountHolderName: data.AccountHolderName,
        IFSC: data.IFSC,
        upi: data.upi || '',
      },
    });
  };

  return (
    <div className="bg-white p-8 dark:bg-black">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
          <h1 className="text-lg font-semibold">Payment Details</h1>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
            <div className="col-span-12 md:col-span-6">
              <GenericInputField
                name="AccountHolderName"
                label="Account Holder Name"
                placeholder="Enter account holder name"
              />
            </div>
            {/* Bank Name */}
            <div className="col-span-12 md:col-span-6">
              <GenericInputField
                name="bankName"
                label="Bank Name"
                placeholder="Enter bank name"
              />
            </div>

            {/* Account Number */}
            <div className="col-span-12 md:col-span-6">
              <GenericInputField
                name="accountNo"
                label="Bank Account Number"
                placeholder="Enter account number"
                type="text"
              />
            </div>

            {/* IFSC Code */}
            <div className="col-span-12 md:col-span-6">
              <GenericInputField
                name="IFSC"
                label="IFSC Code"
                placeholder="Enter IFSC code (e.g., SBIN0001234)"
                type="text"
              />
            </div>

            {/* UPI ID */}
            <div className="col-span-12 md:col-span-6">
              <GenericInputField
                name="upi"
                label="UPI ID (Optional)"
                placeholder="Enter UPI ID (e.g., name@upi)"
                type="text"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <GenericButton type="submit">Save Payment Details</GenericButton>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};
export default PaymentDetails;
