import {useState, useEffect} from 'react';
import useCurrentUser, {CurrentUser} from '@/hooks/useCurrentUser';
import {roleConfig} from '@/lib/roles';
import {UpdateUser, changeCurrentPassword} from '@/lib/api/Auth/auth';
import {uploadPhoto} from '@/lib/api/upload';
import {AUTH_KEYS} from '@/lib/react-query/queryKeys';
import {useQueryClient} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {PATTERNS} from '@/lib/validation/fieldRules';

export default function MyProfilePage() {
  const {data: user, isLoading} = useCurrentUser();
  const queryClient = useQueryClient();

  // Profile Form States
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [posPin, setPosPin] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  // Inline field errors (same rules as the server)
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fieldError = (key: string) =>
    errors[key] ? <p className="field-error">{errors[key]}</p> : null;
  const borderOf = (key: string) =>
    errors[key] ? 'border-error' : 'border-ivory-300';

  useEffect(() => {
    if (user) {
      setFullName(user.fullname || '');
      setMobile(user.phoneNumber || '');
      // Older saves hold only a file name, which would show a broken image
      const {photoUrl} = user as CurrentUser & {photoUrl?: string | null};
      if (photoUrl && /^https?:\/\//.test(photoUrl)) setPhotoPreview(photoUrl);
    }
  }, [user]);

  // Derive display role
  const roleDisplay = user
    ? [
        roleConfig(user.role)?.label ?? user.role,
        user.shop?.name ?? user.branch?.name ?? user.company?.name,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  const initials = (fullName || user?.fullname || 'PS')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      toast.success(`Selected ${file.name}`);
    }
  };

  const handleSaveProfile = async () => {
    const phone = mobile.trim().replace(/^\+91/, '').replace(/\s+/g, '');
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = 'Full name is required';
    if (!phone) next.mobile = 'Mobile number is required';
    else if (!PATTERNS.phone.test(phone))
      next.mobile = 'Enter a valid 10-digit mobile number';
    if (posPin.trim() && !/^\d{4,6}$/.test(posPin.trim()))
      next.posPin = 'PIN must be 4 to 6 digits';
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      setIsSavingProfile(true);
      // Upload first; a failed upload stops the save
      const photoUrl = photoFile ? await uploadPhoto(photoFile) : undefined;
      await UpdateUser({
        fullname: fullName.trim(),
        phoneNumber: phone,
        posPin: posPin.trim() || undefined,
        photoUrl,
      });
      setPhotoFile(null);
      setPosPin('');

      await queryClient.invalidateQueries({
        queryKey: [AUTH_KEYS.GET_CURRENT_USER],
      });
      toast.success('Profile saved successfully');
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to update profile',
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    const next: Record<string, string> = {};
    if (!currentPassword) next.currentPassword = 'Enter your current password';
    if (newPassword.length < 8)
      next.newPassword = 'New password must be at least 8 characters';
    else if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword))
      next.newPassword = 'New password must contain a letter and a number';
    if (newPassword !== confirmPassword)
      next.confirmPassword = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      setIsUpdatingPassword(true);
      await changeCurrentPassword({
        currentPassword,
        newPassword,
        confirmPassword,
        signOutOthers,
      });

      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to change password',
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-4 text-espresso">
      {/* Header */}
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
          SETTINGS / PROFILE & PASSWORD
        </div>
        <h1 className="font-serif text-headline-lg-mobile font-normal text-burgundy md:text-headline-md">
          My profile
        </h1>
      </div>

      {/* 2 Main Columns */}
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        {/* Left Column: Profile Card */}
        <div className="space-y-5 rounded-lg border border-ivory-300 bg-white p-6 shadow-sm">
          <h2
            className="font-serif text-xl text-espresso"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            Profile
          </h2>

          {/* Photo & Avatar */}
          <div className="flex items-center gap-4 pt-1">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#5c1e2b] font-serif text-lg tracking-wider text-white shadow-sm">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                PHOTO
              </label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer rounded border border-ivory-300 bg-white px-3 py-1.5 text-xs font-medium text-espresso transition hover:bg-ivory-50">
                  Choose file
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                <span className="font-mono text-xs text-on-surface-variant">
                  {photoFile ? photoFile.name : 'No file chosen'}
                </span>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 text-xs">
            {/* FULL NAME */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                FULL NAME
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Priya Shinde"
                aria-invalid={!!errors.fullName}
                className={`w-full border ${borderOf('fullName')} rounded bg-white px-3 py-2 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-burgundy`}
              />
              {fieldError('fullName')}
            </div>

            {/* EMAIL (LOGIN) - Disabled */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                EMAIL (LOGIN)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || 'priya.s@matoshri.in'}
                className="w-full cursor-not-allowed rounded border border-ivory-300 bg-[#f5efe9] px-3 py-2 text-xs text-[#524944]"
              />
              <p className="mt-1 font-sans text-[11px] text-on-surface-variant">
                Ask Branch Admin to change
              </p>
            </div>

            {/* MOBILE */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                MOBILE
              </label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 90280 77412"
                aria-invalid={!!errors.mobile}
                className={`w-full border ${borderOf('mobile')} rounded bg-white px-3 py-2 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-burgundy`}
              />
              {fieldError('mobile')}
            </div>

            {/* ROLE - Disabled */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                ROLE
              </label>
              <input
                type="text"
                disabled
                value={roleDisplay}
                className="w-full cursor-not-allowed rounded border border-ivory-300 bg-[#f5efe9] px-3 py-2 text-xs text-[#524944]"
              />
            </div>

            {/* POS PIN */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                POS PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={posPin}
                onChange={(e) => setPosPin(e.target.value.replace(/\D/g, ''))}
                placeholder={
                  user?.hasPosPin
                    ? 'PIN is set. Type a new one to change it'
                    : '4 to 6 digits'
                }
                aria-invalid={!!errors.posPin}
                className={`w-full border ${borderOf('posPin')} rounded bg-white px-3 py-2 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-burgundy`}
              />
              {fieldError('posPin')}
            </div>

            {/* SAVE PROFILE BUTTON */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="rounded bg-burgundy px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#681c2a] disabled:opacity-50"
              >
                {isSavingProfile ? 'SAVING...' : 'SAVE PROFILE'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Change Password Card */}
        <div className="space-y-5 rounded-lg border border-ivory-300 bg-white p-6 shadow-sm">
          <h2
            className="font-serif text-xl text-espresso"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            Change password
          </h2>

          <div className="space-y-4 text-xs">
            {/* CURRENT PASSWORD */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                CURRENT PASSWORD *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                aria-invalid={!!errors.currentPassword}
                className={`w-full border ${borderOf('currentPassword')} rounded bg-white px-3 py-2 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-burgundy`}
              />
              {fieldError('currentPassword')}
            </div>

            {/* NEW PASSWORD */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                NEW PASSWORD *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                aria-invalid={!!errors.newPassword}
                className={`w-full border ${borderOf('newPassword')} rounded bg-white px-3 py-2 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-burgundy`}
              />
              {fieldError('newPassword')}
              <p className="mt-1 font-sans text-[11px] text-on-surface-variant">
                Min 8 characters with a number, an uppercase letter and a symbol
              </p>
            </div>

            {/* CONFIRM NEW PASSWORD */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                CONFIRM NEW PASSWORD *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={!!errors.confirmPassword}
                className={`w-full border ${borderOf('confirmPassword')} rounded bg-white px-3 py-2 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-burgundy`}
              />
              {fieldError('confirmPassword')}
            </div>

            {/* SIGN OUT OF OTHER DEVICES CHECKBOX */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="signout-others"
                checked={signOutOthers}
                onChange={(e) => setSignOutOthers(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-ivory-300 text-burgundy focus:ring-burgundy"
              />
              <label
                htmlFor="signout-others"
                className="cursor-pointer text-xs text-espresso"
              >
                Sign out of all other devices
              </label>
            </div>

            {/* BUTTONS */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="rounded border border-ivory-300 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant transition hover:bg-ivory-50"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleUpdatePassword}
                disabled={isUpdatingPassword}
                className="rounded bg-burgundy px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#681c2a] disabled:opacity-50"
              >
                {isUpdatingPassword ? 'UPDATING...' : 'UPDATE PASSWORD'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
