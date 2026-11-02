import {useModal} from '@/context/ModalContext';
import {useRegisterCateror} from '@/lib/react-query/queriesAndMutations/admin/cateror';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import {catererSchema} from '@/lib/validation/cartererSchema';
import {zodResolver} from '@hookform/resolvers/zod';
import React, {useEffect, useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {z} from 'zod';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';

type FormValues = z.infer<typeof catererSchema>;

interface Language {
  id: string; // or number, depending on your data
  name: string;
}

const Cateror: React.FC = () => {
  const {openModal} = useModal();

  const methods = useForm<FormValues>({
    resolver: zodResolver(catererSchema),
  });

  const {mutateAsync: addCateror} = useRegisterCateror();
  const [languageOptions, setLanguageOptions] = useState([]);

  const {data: languages} = useGetLanguages();

  useEffect(() => {
    if (languages) {
      const options = languages.map((language: Language) => ({
        label: language.name,
        value: language.id,
      }));
      setLanguageOptions(options);
    }
  }, [languages]);

  const onSubmit = async (data: FormValues) => {
    console.log('Form submitted:', data);

    try {
      // Convert dates to UTC format
      const formattedData = {
        ...data,
        startDate: new Date(data.startDate).toISOString(), // Convert to UTC
        expiryDate: new Date(data.expiryDate).toISOString(), // Convert to UTC
      };

      const res = await addCateror(formattedData);
      if (res) openModal('SUCCESS', <p>Cateror Added Successfully!</p>);
    } catch (error) {
      console.log(error);
    }
  };

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
              <GenericInputField
                name="startDate"
                label="Start Date"
                placeholder="Enter the Start Date"
                type="date"
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <GenericInputField
                name="expiryDate"
                label="End Date"
                placeholder="Enter the End Date"
                type="date"
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <GenericInputField
                name="refId"
                label="Referrer ID"
                placeholder="Enter the Referrer ID"
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

export default Cateror;

{
  /* <div className="col-span-12 md:col-span-6">
<label className="mb-2.5 block text-black dark:text-white">
  Software Language
</label>
<Controller
  name="languageId"
  control={control}
  render={() => (
    <AsyncSelect
      cacheOptions
      loadOptions={languageOptions}
      defaultOptions
      value={softwareLanguage}
      onChange={(option) => {
        setSoftwareLanguage(
          option as {value: string; label: string},
        );
        setValue('languageId', option?.value || '');
      }}
      placeholder="Select a language"
      isSearchable
      classNamePrefix="react-select"
      className="w-full rounded border border-zinc-300"
      isLoading={isFetching}
    />
  )}
/>
{errors.languageId && (
  <p className="text-red-500">{errors.languageId.message}</p>
)}
</div>

<div className="col-span-12 md:col-span-6">
<label className="mb-2.5 block text-black dark:text-white">
  Data Language
</label>
<Controller
  name="languageId"
  control={control}
  render={() => (
    <AsyncSelect
      cacheOptions
      loadOptions={languageOptions}
      defaultOptions
      value={softwareLanguage}
      onChange={(option) => {
        setSoftwareLanguage(
          option as {value: string; label: string},
        );
        setValue('languageId', option?.value || '');
      }}
      placeholder="Select a language"
      isSearchable
      classNamePrefix="react-select"
      className="w-full rounded border border-zinc-300"
      isLoading={isFetching}
    />
  )}
/>
{errors.languageId && (
  <p className="text-red-500">{errors.languageId.message}</p>
)}
</div> */
}
