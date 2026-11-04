import {useState} from 'react';
import toast from 'react-hot-toast';

export default function BranchMyProfilePage() {
  const [fullName, setFullName] = useState('Snehal Kulkarni');
  const [mobile, setMobile] = useState('+91 98220 41760');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signOutOthers, setSignOutOthers] = useState(true);

  const handleSaveProfile = () => {
    toast.success('Profile saved successfully');
  };

  const handleUpdatePassword = () => {
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
    toast.success('Password updated successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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

      {/* Grid: Profile Card & Change Password Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Card: Profile */}
        <div className="bg-white border border-[#efe9e3] rounded-lg p-6 shadow-sm space-y-4">
          <h3
            className="text-base font-serif font-semibold text-[#2a2220]"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            Profile
          </h3>

          {/* Photo and Initials */}
          <div className="flex items-center gap-4 pt-1">
            <div className="w-14 h-14 rounded-full bg-[#531c26] text-white text-lg font-bold flex items-center justify-center shrink-0">
              SK
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                PHOTO
              </div>
              <input
                type="file"
                className="text-xs text-[#554e48] file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-[#ded5ce] file:text-xs file:bg-[#faf7f4] file:text-[#2a2220] hover:file:bg-[#f0eae3]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              FULL NAME
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              EMAIL (LOGIN)
            </label>
            <input
              type="email"
              value="snehal.k@matoshri.in"
              disabled
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#736862] bg-[#f5ede7]/50 cursor-not-allowed"
            />
            <span className="text-[10px] text-[#8b6f66] mt-0.5 block">
              Ask Company Admin to change
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              MOBILE
            </label>
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              ROLE
            </label>
            <input
              type="text"
              value="Branch Admin · Sangli Branch"
              disabled
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#736862] bg-[#f5ede7]/50 cursor-not-allowed"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleSaveProfile}
              className="w-full bg-[#7a2222] hover:bg-[#681c1c] text-white text-xs font-semibold py-2.5 rounded tracking-wider uppercase transition shadow-sm"
            >
              SAVE PROFILE
            </button>
          </div>
        </div>

        {/* Right Card: Change Password */}
        <div className="bg-white border border-[#efe9e3] rounded-lg p-6 shadow-sm space-y-4">
          <h3
            className="text-base font-serif font-semibold text-[#2a2220]"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            Change password
          </h3>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              CURRENT PASSWORD *
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              NEW PASSWORD *
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
            <span className="text-[10px] text-[#8b6f66] mt-0.5 block">
              Min 8 characters with a number, an uppercase letter and a symbol
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              CONFIRM NEW PASSWORD *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-[#2a2220]">
            <input
              type="checkbox"
              checked={signOutOthers}
              onChange={(e) => setSignOutOthers(e.target.checked)}
              className="accent-[#832729] rounded"
            />
            <span>Sign out of all other devices</span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="border border-[#ded5ce] text-[#736862] px-4 py-2 rounded text-xs font-semibold tracking-wider uppercase hover:bg-[#faf7f4] transition"
            >
              CANCEL
            </button>
            <button
              onClick={handleUpdatePassword}
              className="flex-1 bg-[#7a2222] hover:bg-[#681c1c] text-white text-xs font-semibold py-2 rounded tracking-wider uppercase transition shadow-sm"
            >
              UPDATE PASSWORD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

