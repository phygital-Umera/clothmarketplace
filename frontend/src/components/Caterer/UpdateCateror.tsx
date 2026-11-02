import React, {useEffect, useState} from 'react';
import {useForm, FormProvider, Controller} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericButton from '../Forms/Buttons/GenericButton';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import {
  useGetCaterorById,
  useUpdateCateror,
} from '@/lib/react-query/queriesAndMutations/admin/cateror';
import {useNavigate} from '@tanstack/react-router';
import {updatecaterorSchema} from '@/lib/validations/cateror.validation';

type FormValues = z.infer<typeof updatecaterorSchema>;

interface Props {
  id: string;
}

interface Language {
  id: string;
  name: string;
}

const UpdateCateror: React.FC<Props> = ({id}: Props) => {
  const navigate = useNavigate();

  const methods = useForm<FormValues>({
    resolver: zodResolver(updatecaterorSchema),
  });

  const [languageOptions, setLanguageOptions] = useState([]);

  const {data: languages} = useGetLanguages();
  const {data: caterorData, isLoading, error} = useGetCaterorById(id);

  const {mutate: updateCateror, isPending} = useUpdateCateror(); // Use the mutation hook

  useEffect(() => {
    if (languages) {
      const options = languages.map((language: Language) => ({
        label: language.name,
        value: language.id,
      }));
      setLanguageOptions(options);
    }
  }, [languages]);

  useEffect(() => {
    if (caterorData?.data) {
      const {
        fullname,
        phoneNumber,
        address,
        startDate,
        expiryDate,
        subscriptionPlan,
        amount,
        email,
        renewalAmount,
        city,
        state,
        languageId,
        username,
        refId,
      } = caterorData.data;
      console.log(caterorData);

      // Reset the form fields with the cateror data
      methods.reset({
        fullname,
        phoneNumber,
        address,
        email,
        subscriptionPlan,
        city,
        startDate,
        expiryDate,
        amount,
        state,
        languageId,
        renewalAmount,
        username,
        refId,
      });
    }
  }, [caterorData, methods]);

  const onSubmit = (data: FormValues) => {
    console.log('Form Data:', data);
    updateCateror(
      {
        id: id,
        data: {
          ...data,
          startDate: new Date(data.startDate).toISOString(), // Convert to UTC
          expiryDate: new Date(data.expiryDate).toISOString(), // Convert to UTC
        },
      },

      {
        onSuccess: () => {
          navigate({to: '/admin/cateror'});
        },
        onError: (error) => {
          // console.log('Failed to update cateror:', error);
        },
      },
    );
  };

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error loading cateror data</p>;

  return (
    <>
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(onSubmit)}
          className="space-y-8 bg-white p-8 dark:bg-black"
        >
          {/* Add Caterer Form */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
            <h1 className="col-span-12 mb-4 text-lg font-semibold">
              Add Cateror
            </h1>

            <div className="col-span-12 md:col-span-6">
              <GenericInputField
                name="fullname"
                label="Full Name"
                placeholder="Enter your Full Name"
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <GenericInputField
                name="phoneNumber"
                label="Phone Number"
                placeholder="Enter the Phone Number"
              />
            </div>

            <div className="col-span-12 md:col-span-full">
              <GenericTextArea
                name="address"
                label="Residential Address"
                placeholder="Enter the Residential Address"
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <GenericSearchDropdown
                name="state"
                label="State"
                options={[
                  {label: 'Andhra Pradesh', value: 'Andhra Pradesh'},
                  {label: 'Arunachal Pradesh', value: 'Arunachal Pradesh'},
                  {label: 'Assam', value: 'Assam'},
                  {label: 'Bihar', value: 'Bihar'},
                  {label: 'Chhattisgarh', value: 'Chhattisgarh'},
                  {label: 'Goa', value: 'Goa'},
                  {label: 'Gujarat', value: 'Gujarat'},
                  {label: 'Haryana', value: 'Haryana'},
                  {label: 'Himachal Pradesh', value: 'Himachal Pradesh'},
                  {label: 'Jharkhand', value: 'Jharkhand'},
                  {label: 'Karnataka', value: 'Karnataka'},
                  {label: 'Kerala', value: 'Kerala'},
                  {label: 'Madhya Pradesh', value: 'Madhya Pradesh'},
                  {label: 'Maharashtra', value: 'Maharashtra'},
                  {label: 'Manipur', value: 'Manipur'},
                  {label: 'Meghalaya', value: 'Meghalaya'},
                  {label: 'Mizoram', value: 'Mizoram'},
                  {label: 'Nagaland', value: 'Nagaland'},
                  {label: 'Odisha', value: 'Odisha'},
                  {label: 'Punjab', value: 'Punjab'},
                  {label: 'Rajasthan', value: 'Rajasthan'},
                  {label: 'Sikkim', value: 'Sikkim'},
                  {label: 'Tamil Nadu', value: 'Tamil Nadu'},
                  {label: 'Telangana', value: 'Telangana'},
                  {label: 'Tripura', value: 'Tripura'},
                  {label: 'Uttar Pradesh', value: 'Uttar Pradesh'},
                  {label: 'Uttarakhand', value: 'Uttarakhand'},
                  {label: 'West Bengal', value: 'West Bengal'},
                  {
                    label: 'Andaman and Nicobar Islands',
                    value: 'Andaman and Nicobar Islands',
                  },
                  {label: 'Chandigarh', value: 'Chandigarh'},
                  {
                    label: 'Dadra and Nagar Haveli and Daman and Diu',
                    value: 'Dadra and Nagar Haveli and Daman and Diu',
                  },
                  {label: 'Lakshadweep', value: 'Lakshadweep'},
                  {label: 'Delhi', value: 'Delhi'},
                  {label: 'Puducherry', value: 'Puducherry'},
                ]}
                defaultOption=""
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <GenericInputField
                name="city"
                label="City"
                placeholder="Enter your City"
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <GenericInputField
                name="email"
                label="Email"
                placeholder="Enter your Email"
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <GenericSearchDropdown
                name="subscriptionPlan"
                label="Plan"
                options={[
                  {label: 'silver', value: 'silver'},
                  {label: 'gold', value: 'gold'},
                  {label: 'platinum', value: 'platinum'},
                ]}
                defaultOption=""
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <GenericSearchDropdown
                name="languageId"
                label="Software Language"
                options={languageOptions}
                defaultOption=""
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <GenericSearchDropdown
                name="languageId"
                label="Data Language"
                options={languageOptions}
                defaultOption=""
              />
            </div>

            <div className="col-span-12 md:col-span-3">
              <GenericInputField
                name="amount"
                label="Amount"
                placeholder="Enter the Amount"
              />
            </div>

            <div className="col-span-12 md:col-span-3">
              <GenericInputField
                name="renewalAmount"
                label="Renewal Amount"
                placeholder="Enter the Renewal Amount"
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <Controller
                name="startDate"
                control={methods.control}
                render={({field}) => (
                  <GenericInputField
                    {...field}
                    label="Start Date"
                    placeholder="Enter the Start Date"
                    type="date"
                  />
                )}
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <Controller
                name="expiryDate"
                control={methods.control}
                render={({field}) => (
                  <GenericInputField
                    {...field}
                    label="Expiry Date"
                    placeholder="Enter the Expiry Date"
                    type="date"
                  />
                )}
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <GenericInputField
                name="refId"
                label="Referrer ID"
                placeholder="Enter the Referrer ID"
                disabled
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <GenericInputField
                name="username"
                label="Username"
                placeholder="Enter the Referrer ID"
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <GenericInputField
                name="password"
                label="Password"
                placeholder="Enter the Password"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            <GenericButton type="submit">Save</GenericButton>
          </div>
        </form>
      </FormProvider>
    </>
  );
};

export default UpdateCateror;
