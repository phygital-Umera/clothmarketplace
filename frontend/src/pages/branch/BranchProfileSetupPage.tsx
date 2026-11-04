import {useState} from 'react';
import {
  useBranchProfileSetup,
  useUpdateBranchProfileSetup,
} from '@/lib/react-query/queriesAndMutations/branchExtras';
import {Plus, X, Clock} from 'lucide-react';
import toast from 'react-hot-toast';

export default function BranchProfileSetupPage() {
  const {data} = useBranchProfileSetup();
  const updateMutation = useUpdateBranchProfileSetup();

  const [email, setEmail] = useState(data?.contact?.email || 'sangli@matoshri.in');
  const [phone, setPhone] = useState(data?.contact?.phone || '+91 233 262 0011');
  const [alternatePhone, setAlternatePhone] = useState(data?.contact?.alternatePhone || '');
  const [whatsapp, setWhatsapp] = useState(data?.contact?.whatsapp || '');
  const [address, setAddress] = useState(data?.contact?.address || '[Shop no.] Station Road');
  const [city, setCity] = useState(data?.contact?.city || 'Sangli');
  const [pincode, setPincode] = useState(data?.contact?.pincode || '416416');
  const [mapsLink, setMapsLink] = useState(data?.contact?.mapsLink || '');

  const [operatingHours, setOperatingHours] = useState(
    data?.operatingHours || [
      {day: 'Monday', open: true, from: '10:00 AM', to: '09:00 PM'},
      {day: 'Tuesday', open: true, from: '10:00 AM', to: '09:00 PM'},
      {day: 'Wednesday', open: true, from: '10:00 AM', to: '09:00 PM'},
      {day: 'Thursday', open: true, from: '10:00 AM', to: '09:00 PM'},
      {day: 'Friday', open: true, from: '10:00 AM', to: '09:00 PM'},
      {day: 'Saturday', open: true, from: '10:00 AM', to: '10:00 PM'},
      {day: 'Sunday', open: true, from: '10:00 AM', to: '10:00 PM'},
    ],
  );

  const [holidays, setHolidays] = useState(
    data?.holidays || [
      {id: '1', name: 'Diwali – Laxmi Pujan', dateDesc: 'Fri 20 Nov 2026 · closes 14:00'},
      {id: '2', name: 'Annual stock count', dateDesc: 'Sun 29 Nov 2026 · closed'},
    ],
  );

  const handleToggleDay = (idx: number) => {
    const updated = [...operatingHours];
    updated[idx].open = !updated[idx].open;
    setOperatingHours(updated);
  };

  const handleTimeChange = (idx: number, field: 'from' | 'to', val: string) => {
    const updated = [...operatingHours];
    updated[idx][field] = val;
    setOperatingHours(updated);
  };

  const handleRemoveHoliday = (id: string) => {
    setHolidays(holidays.filter((h) => h.id !== id));
  };

  const handleAddHoliday = () => {
    const name = window.prompt('Holiday / Closure name:');
    if (!name) return;
    const desc = window.prompt('Date & hours description (e.g. 25 Dec · closed):') || 'closed';
    setHolidays([...holidays, {id: String(Date.now()), name, dateDesc: desc}]);
  };

  const handleSaveChanges = async () => {
    await updateMutation.mutateAsync({
      contact: {
        email,
        phone,
        alternatePhone,
        whatsapp,
        address,
        city,
        pincode,
        mapsLink,
      },
      operatingHours,
      holidays,
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto text-[#2b2b2b]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66] mb-1">
            SETUP / BRANCH PROFILE
          </div>
          <h1
            className="text-3xl font-serif text-[#2a2220] tracking-tight"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            Branch profile
          </h1>
          <p className="text-sm text-[#736862] mt-1">
            Name, code and status are set by your Company Admin. You can update contact details and hours.
          </p>
        </div>

        <button
          onClick={handleSaveChanges}
          disabled={updateMutation.isPending}
          className="self-start bg-[#7a2222] hover:bg-[#681c1c] text-white px-5 py-2 rounded text-xs font-semibold tracking-wider uppercase transition shadow-sm disabled:opacity-50"
        >
          {updateMutation.isPending ? 'SAVING...' : 'SAVE CHANGES'}
        </button>
      </div>

      {/* Main Grid: Left 2 columns & Right column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Identity, Contact & Operating Hours */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card: Branch Identity */}
          <div className="bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3
                className="text-base font-serif font-semibold text-[#2a2220]"
                style={{fontFamily: "'Playfair Display', Georgia, serif"}}
              >
                Branch identity
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af]" />
                READ-ONLY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                  BRANCH NAME
                </label>
                <input
                  type="text"
                  value="Sangli Branch"
                  disabled
                  className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#736862] bg-[#f5ede7]/50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                  BRANCH CODE
                </label>
                <input
                  type="text"
                  value="MAT-B02"
                  disabled
                  className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#736862] bg-[#f5ede7]/50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                  COMPANY
                </label>
                <input
                  type="text"
                  value="Matoshri Fashions"
                  disabled
                  className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#736862] bg-[#f5ede7]/50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  value="27ABCDE1234F1Z5"
                  disabled
                  className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#736862] bg-[#f5ede7]/50 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Card: Contact & Address */}
          <div className="bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm space-y-4">
            <h3
              className="text-base font-serif font-semibold text-[#2a2220]"
              style={{fontFamily: "'Playfair Display', Georgia, serif"}}
            >
              Contact & address
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                  BRANCH EMAIL *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                  BRANCH PHONE *
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                  ALTERNATE PHONE
                </label>
                <input
                  type="text"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                  WHATSAPP FOR CUSTOMERS
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                ADDRESS *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                  CITY
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                  PIN CODE
                </label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                GOOGLE MAPS LINK
              </label>
              <input
                type="text"
                value={mapsLink}
                onChange={(e) => setMapsLink(e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>
          </div>

          {/* Card: Operating Hours */}
          <div className="bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm space-y-4">
            <h3
              className="text-base font-serif font-semibold text-[#2a2220]"
              style={{fontFamily: "'Playfair Display', Georgia, serif"}}
            >
              Operating hours
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#f0eae3] bg-[#faf7f4] text-[#8b6f66] uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-2.5 px-3">DAY</th>
                    <th className="py-2.5 px-3">OPEN</th>
                    <th className="py-2.5 px-3">FROM</th>
                    <th className="py-2.5 px-3">TO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f7f2ed]">
                  {operatingHours.map((row, idx) => (
                    <tr key={row.day} className="hover:bg-[#fdfbfa]">
                      <td className="py-2.5 px-3 font-medium text-[#2a2220]">
                        {row.day}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={row.open}
                          onChange={() => handleToggleDay(idx)}
                          className="accent-[#832729] rounded cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="relative inline-flex items-center">
                          <input
                            type="text"
                            value={row.from}
                            onChange={(e) => handleTimeChange(idx, 'from', e.target.value)}
                            disabled={!row.open}
                            className="border border-[#ded5ce] rounded px-2.5 py-1 text-xs text-[#2a2220] bg-white disabled:bg-gray-100 disabled:text-gray-400 w-28"
                          />
                          <Clock className="w-3.5 h-3.5 text-[#736862] absolute right-2" />
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="relative inline-flex items-center">
                          <input
                            type="text"
                            value={row.to}
                            onChange={(e) => handleTimeChange(idx, 'to', e.target.value)}
                            disabled={!row.open}
                            className="border border-[#ded5ce] rounded px-2.5 py-1 text-xs text-[#2a2220] bg-white disabled:bg-gray-100 disabled:text-gray-400 w-28"
                          />
                          <Clock className="w-3.5 h-3.5 text-[#736862] absolute right-2" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Holidays, At a Glance, Your Access */}
        <div className="lg:col-span-4 space-y-6">
          {/* Holidays & closures */}
          <div className="bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3
                className="text-base font-serif font-semibold text-[#2a2220]"
                style={{fontFamily: "'Playfair Display', Georgia, serif"}}
              >
                Holidays & closures
              </h3>
              <button
                onClick={handleAddHoliday}
                className="inline-flex items-center gap-1 border border-[#ded5ce] text-[#736862] hover:text-[#2a2220] px-2.5 py-1 rounded text-xs font-semibold tracking-wider uppercase hover:bg-[#faf7f4]"
              >
                <Plus className="w-3.5 h-3.5" />
                ADD
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start justify-between p-2.5 rounded bg-[#faf7f4] border border-[#f0eae3]"
                >
                  <div>
                    <div className="font-semibold text-[#2a2220]">{h.name}</div>
                    <div className="text-[11px] text-[#736862] mt-0.5">{h.dateDesc}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveHoliday(h.id)}
                    className="text-[#736862] hover:text-red-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* At a glance */}
          <div className="bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm space-y-3 text-xs">
            <h3
              className="text-base font-serif font-semibold text-[#2a2220]"
              style={{fontFamily: "'Playfair Display', Georgia, serif"}}
            >
              At a glance
            </h3>

            <div className="space-y-2 divide-y divide-[#f7f2ed]">
              <div className="flex justify-between pt-1">
                <span className="text-[#736862]">Shops</span>
                <span className="font-semibold text-[#2a2220]">3</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-[#736862]">Employees</span>
                <span className="font-semibold text-[#2a2220]">14</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-[#736862]">Branch opened</span>
                <span className="font-semibold text-[#2a2220]">01 Nov 2026</span>
              </div>
              <div className="flex justify-between pt-2 items-center">
                <span className="text-[#736862]">Status</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  ACTIVE
                </span>
              </div>
            </div>
          </div>

          {/* Your access */}
          <div className="bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm space-y-2 text-xs">
            <h3
              className="text-base font-serif font-semibold text-[#2a2220]"
              style={{fontFamily: "'Playfair Display', Georgia, serif"}}
            >
              Your access
            </h3>
            <p className="text-[#554e48] leading-relaxed text-[11px]">
              You manage billing oversight, purchases, supplier payments, stock transfers, customer credit and staff for this branch. Refunds and stock write-offs above limits go to the Company Admin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

