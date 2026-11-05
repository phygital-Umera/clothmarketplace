import {useState, useEffect} from 'react';
import useCurrentUser from '@/hooks/useCurrentUser';
import {UpdateUser, changeCurrentPassword} from '@/lib/api/Auth/auth';
import {useQueryClient} from '@tanstack/react-query';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    if (user) {
      setFullName(user.fullname || '');
      setMobile(user.phoneNumber || '');
      setPosPin((user as any).posPin || '1234');
      if ((user as any).photoUrl) {
        setPhotoPreview((user as any).photoUrl);
      }
    }
  }, [user]);

  // Derive display role
  const roleDisplay = (() => {
    if (!user) return 'Shop Manager';
    const baseRole =
      user.role === 'SHOP_ADMIN'
        ? 'Shop Manager'
        : user.role === 'ADMIN'
        ? 'Branch Manager'
        : user.role === 'SUPER_ADMIN'
        ? 'Super Admin'
        : user.role;

    const parts = [baseRole];
    if (user.shop?.name) parts.push(user.shop.name);
    else if (user.branch?.name) parts.push(user.branch.name);

    return parts.join(' · ');
  })();

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
    if (!fullName.trim()) {
      toast.error('Full Name is required');
      return;
    }
    if (!mobile.trim()) {
      toast.error('Mobile number is required');
      return;
    }

    try {
      setIsSavingProfile(true);
      await UpdateUser({
        fullname: fullName.trim(),
        phoneNumber: mobile.trim(),
        posPin: posPin.trim() || undefined,
        photoUrl: photoFile ? photoFile.name : undefined,
      });

      await queryClient.invalidateQueries({queryKey: ['currentUser']});
      toast.success('Profile saved successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

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
      toast.error(err?.response?.data?.message || err?.message || 'Failed to change password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto text-[#2b2b2b]">
      {/* Header */}
      <div>
        <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66] mb-1">
          SETTINGS / PROFILE & PASSWORD
        </div>
        <h1
          className="text-3xl font-serif text-[#2a2220] tracking-tight"
          style={{fontFamily: "'Playfair Display', Georgia, serif"}}
        >
          My profile
        </h1>
      </div>

      {/* 2 Main Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Column: Profile Card */}
        <div className="bg-white border border-[#efe9e3] rounded-lg p-6 shadow-sm space-y-5">
          <h2
            className="text-xl font-serif text-[#2a2220]"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            Profile
          </h2>

          {/* Photo & Avatar */}
          <div className="flex items-center gap-4 pt-1">
            <div className="w-16 h-16 rounded-full bg-[#5c1e2b] text-white flex items-center justify-center text-lg font-serif tracking-wider overflow-hidden shrink-0 shadow-sm">
              {photoPreview ? (
                <img src={photoPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862]">
                PHOTO
              </label>
              <div className="flex items-center gap-2">
                <label className="border border-[#ded5ce] bg-white text-[#2a2220] px-3 py-1.5 rounded text-xs cursor-pointer hover:bg-[#faf7f4] transition font-medium">
                  Choose file
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-[#736862] font-mono">
                  {photoFile ? photoFile.name : 'No file chosen'}
                </span>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 text-xs">
            {/* FULL NAME */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862] mb-1">
                FULL NAME
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Priya Shinde"
                className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>

            {/* EMAIL (LOGIN) - Disabled */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862] mb-1">
                EMAIL (LOGIN)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || 'priya.s@matoshri.in'}
                className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#524944] bg-[#f5efe9] cursor-not-allowed"
              />
              <p className="text-[11px] text-[#8b6f66] mt-1 font-sans">
                Ask Branch Admin to change
              </p>
            </div>

            {/* MOBILE */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862] mb-1">
                MOBILE
              </label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 90280 77412"
                className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>

            {/* ROLE - Disabled */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862] mb-1">
                ROLE
              </label>
              <input
                type="text"
                disabled
                value={roleDisplay}
                className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#524944] bg-[#f5efe9] cursor-not-allowed"
              />
            </div>

            {/* POS PIN */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862] mb-1">
                POS PIN
              </label>
              <input
                type="text"
                maxLength={6}
                value={posPin}
                onChange={(e) => setPosPin(e.target.value)}
                placeholder="4 digits"
                className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>

            {/* SAVE PROFILE BUTTON */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="bg-[#7a2232] hover:bg-[#681c2a] text-white text-xs font-semibold px-6 py-2.5 rounded tracking-wider uppercase transition shadow-sm disabled:opacity-50"
              >
                {isSavingProfile ? 'SAVING...' : 'SAVE PROFILE'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Change Password Card */}
        <div className="bg-white border border-[#efe9e3] rounded-lg p-6 shadow-sm space-y-5">
          <h2
            className="text-xl font-serif text-[#2a2220]"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            Change password
          </h2>

          <div className="space-y-4 text-xs">
            {/* CURRENT PASSWORD */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862] mb-1">
                CURRENT PASSWORD *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>

            {/* NEW PASSWORD */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862] mb-1">
                NEW PASSWORD *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
              <p className="text-[11px] text-[#8b6f66] mt-1 font-sans">
                Min 8 characters with a number, an uppercase letter and a symbol
              </p>
            </div>

            {/* CONFIRM NEW PASSWORD */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862] mb-1">
                CONFIRM NEW PASSWORD *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>

            {/* SIGN OUT OF OTHER DEVICES CHECKBOX */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="signout-others"
                checked={signOutOthers}
                onChange={(e) => setSignOutOthers(e.target.checked)}
                className="rounded border-[#ded5ce] text-[#832729] focus:ring-[#832729] w-4 h-4 cursor-pointer"
              />
              <label htmlFor="signout-others" className="text-xs text-[#2a2220] cursor-pointer">
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
                className="border border-[#ded5ce] text-[#736862] hover:bg-[#faf7f4] text-xs font-semibold px-5 py-2.5 rounded tracking-wider uppercase transition"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleUpdatePassword}
                disabled={isUpdatingPassword}
                className="bg-[#7a2232] hover:bg-[#681c2a] text-white text-xs font-semibold px-6 py-2.5 rounded tracking-wider uppercase transition shadow-sm disabled:opacity-50"
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

