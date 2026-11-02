import {catererSchema} from '@/lib/validation/cartererSchema';
import {FormProvider, useForm} from 'react-hook-form';
import {z} from 'zod';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import {zodResolver} from '@hookform/resolvers/zod';
import {useEffect, useState} from 'react';
import {profileSchema} from '@/lib/validation/profileSchemas';
import {useAuthContext} from '@/context/AuthContext';
import {useGetCaterorById} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {useUpdateCaterorProfile} from '@/lib/react-query/queriesAndMutations/cateror/caterorprofile';

type FormValues = z.infer<typeof profileSchema>;

const Profile: React.FC = () => {
  const {user, role} = useAuthContext();
  // console.log('Profile User :', user);

  const methods = useForm<FormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullname: '',
      phoneNumber: '',
      address: '',
      state: '',
      city: '',
      email: '',
      username: '',
      password: '',
    },
  });
  const {watch} = methods;

  const watchFiles = watch('imageFile');

  const [imageError, setImageError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const {mutate: updateCateror} = useUpdateCaterorProfile();

  const {data: profiledata} = useGetCaterorById(user?.caterorId || '');

  console.log('Profile Data:', profiledata);

  // Set default form values when profiledata is available
  useEffect(() => {
    if (profiledata) {
      methods.reset({
        fullname: profiledata?.data.user?.fullname || '',
        phoneNumber: profiledata?.data.user?.phoneNumber || '',
        address: profiledata?.data.address || '',
        state: profiledata?.data?.state || '',
        city: profiledata?.data.city || '',
        email: profiledata?.data.user?.email || '',
        username: profiledata?.data.user?.username || '',
        // password: profiledata?.data.user?.password, // Keep password field empty for security
      });
    }
  }, [profiledata, methods]);

  const onSubmit = (data: FormValues) => {
    console.log('Submitted Data', data);

    const selectedFiles =
      watchFiles instanceof FileList ? Array.from(watchFiles) : [];

    updateCateror({
      caterorId: user?.caterorId || '',
      fullname: data.fullname,
      phoneNumber: data.phoneNumber,
      email: data.email,
      address: data.address,
      state: data.state,
      city: data.city,
      username: data.username,
      password: data.password,
      imageFile: selectedFiles[0], // Ensure file is included if needed
    });
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Update Your Profile
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
              disabled
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="username"
              label="Username"
              placeholder="Enter your Username"
              disabled
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="password"
              label="Password"
              placeholder="Enter the Password"
              type="password"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <input
              type="file"
              {...methods.register('imageFile')}
              className="mt-10 bg-white file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:bg-black"
              multiple={false}
            />
            {imageError && (
              <p className="mt-2 text-sm text-red-600">{imageError}</p>
            )}
            {imageUrl && (
              <div className="mt-4">
                <img
                  src={imageUrl}
                  alt="Profile Preview"
                  className="h-auto max-h-48 w-full rounded-md object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <GenericButton type="submit">Save</GenericButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default Profile;
