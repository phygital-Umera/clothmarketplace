import {useState} from 'react';
import {
  useBranchStaffOverview,
  useInviteBranchStaff,
} from '@/lib/react-query/queriesAndMutations/branchExtras';
import toast from 'react-hot-toast';

export default function BranchStaffPage() {
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [selectedShop, setSelectedShop] = useState<string>('All shops');
  const [search, setSearch] = useState<string>('');

  const {data} = useBranchStaffOverview({
    tab: activeTab === 'ALL' ? undefined : activeTab,
    shop: selectedShop === 'All shops' ? undefined : selectedShop,
    search: search.trim() || undefined,
  });

  const inviteMutation = useInviteBranchStaff();

  // Invite Form state
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [shop, setShop] = useState("Men's Wear");
  const [role, setRole] = useState('Sales associate');
  const [joiningDate, setJoiningDate] = useState('2026-11-10');
  const [shift, setShift] = useState('Morning');
  const [permPos, setPermPos] = useState(true);
  const [permCredit, setPermCredit] = useState(true);
  const [permReceive, setPermReceive] = useState(false);
  const [permStock, setPermStock] = useState(false);
  const [permReturn, setPermReturn] = useState(true);

  const summary = data?.summary || {
    totalStaff: 14,
    totalStaffSub: '+1 unassigned',
    onShiftNow: 11,
    onShiftNowSub: '3 on leave',
    invitesPending: 1,
    invitesPendingSub: 'Akash Lohar',
  };

  const staff = data?.items || [
    {
      id: '1',
      name: 'Rahul Mane',
      empCode: 'EMP-0012',
      phone: '+91 98901 22311',
      initials: 'RM',
      shopName: "Men's Wear",
      role: 'Shop manager',
      todayAttendance: 'In · 9:52 AM',
      status: 'ACTIVE',
    },
    {
      id: '2',
      name: 'Sagar Jadhav',
      empCode: 'EMP-0016',
      phone: '+91 97300 11290',
      initials: 'SJ',
      shopName: "Men's Wear",
      role: 'Cashier',
      todayAttendance: 'In · 9:58 AM',
      status: 'ACTIVE',
    },
    {
      id: '3',
      name: 'Priya Shinde',
      empCode: 'EMP-0015',
      phone: '+91 85030 77412',
      initials: 'PS',
      shopName: "Women's Wear",
      role: 'Shop manager',
      todayAttendance: 'In · 9:45 AM',
      status: 'ACTIVE',
    },
    {
      id: '4',
      name: 'Pallavi Kale',
      empCode: 'EMP-0017',
      phone: '+91 96000 42119',
      initials: 'PK',
      shopName: "Women's Wear",
      role: 'Sales associate',
      todayAttendance: 'On leave',
      status: 'ACTIVE',
    },
    {
      id: '5',
      name: 'Rutuja Pawar',
      empCode: 'EMP-0018',
      phone: '+91 93700 55621',
      initials: 'RP',
      shopName: "Women's Wear",
      role: 'Cashier',
      todayAttendance: 'In · 10:02 AM',
      status: 'ACTIVE',
    },
    {
      id: '6',
      name: 'Kiran More',
      empCode: 'EMP-0019',
      phone: '+91 77090 31122',
      initials: 'KM',
      shopName: 'Kids Wear',
      role: 'Cashier',
      todayAttendance: 'In · 10:05 AM',
      status: 'ACTIVE',
    },
    {
      id: '7',
      name: 'Akash Lohar',
      empCode: 'EMP-0024',
      phone: '+91 89990 12090',
      initials: 'AL',
      shopName: 'Unassigned',
      role: 'New joiner',
      todayAttendance: '—',
      status: 'INVITED',
    },
    {
      id: '8',
      name: 'Nilesh Gurav',
      empCode: 'EMP-0009',
      phone: '+91 910490 66012',
      initials: 'NG',
      shopName: "Men's Wear",
      role: 'Stock keeper',
      todayAttendance: '—',
      status: 'INACTIVE',
    },
  ];

  const handleSendInvite = async () => {
    if (!fullName.trim() || !mobile.trim()) {
      toast.error('Please enter full name and mobile number');
      return;
    }
    await inviteMutation.mutateAsync({
      fullName,
      mobile,
      email: email || `${fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      shopName: shop,
      role,
      joiningDate,
      shift,
    });
    setFullName('');
    setMobile('');
    setEmail('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            ACTIVE
          </span>
        );
      case 'INVITED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
            INVITED
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af]" />
            INACTIVE
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto text-[#2b2b2b]">
      {/* Header */}
      <div>
        <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66] mb-1">
          SETUP / STAFF
        </div>
        <h1
          className="text-3xl font-serif text-[#2a2220] tracking-tight"
          style={{fontFamily: "'Playfair Display', Georgia, serif"}}
        >
          Staff
        </h1>
        <p className="text-sm text-[#736862] mt-1">
          Staff working in Sangli Branch shops.
        </p>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#efe9e3] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66]">
            TOTAL STAFF
          </div>
          <div
            className="text-2xl font-serif font-semibold text-[#2a2220] mt-1"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {summary.totalStaff}
          </div>
          <div className="text-xs text-[#736862] mt-1 font-sans">
            {summary.totalStaffSub}
          </div>
        </div>

        <div className="bg-white border border-[#efe9e3] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66]">
            ON SHIFT NOW
          </div>
          <div
            className="text-2xl font-serif font-semibold text-[#2a2220] mt-1"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {summary.onShiftNow}
          </div>
          <div className="text-xs text-[#736862] mt-1 font-sans">
            {summary.onShiftNowSub}
          </div>
        </div>

        <div className="bg-white border border-[#efe9e3] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66]">
            INVITES PENDING
          </div>
          <div
            className="text-2xl font-serif font-semibold text-[#2a2220] mt-1"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {summary.invitesPending}
          </div>
          <div className="text-xs text-[#736862] mt-1 font-sans">
            {summary.invitesPendingSub}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Staff Table & Right Invite Employee */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Table */}
        <div className="lg:col-span-8 bg-white border border-[#efe9e3] rounded-lg shadow-sm overflow-hidden space-y-4 p-4">
          {/* Tabs and Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs font-semibold tracking-wider uppercase border-b border-[#f2ede7] pb-2 sm:pb-0 sm:border-0">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`flex items-center gap-1.5 pb-1 transition ${
                  activeTab === 'ALL'
                    ? 'text-[#832729] border-b-2 border-[#832729] font-bold'
                    : 'text-[#736862]'
                }`}
              >
                <span>ALL</span>
                <span className="bg-[#832729] text-white text-[10px] px-1.5 rounded-full">
                  15
                </span>
              </button>
              <button
                onClick={() => setActiveTab('ACTIVE')}
                className={`pb-1 transition ${
                  activeTab === 'ACTIVE'
                    ? 'text-[#832729] border-b-2 border-[#832729] font-bold'
                    : 'text-[#736862]'
                }`}
              >
                ACTIVE
              </button>
              <button
                onClick={() => setActiveTab('INVITED')}
                className={`pb-1 transition ${
                  activeTab === 'INVITED'
                    ? 'text-[#832729] border-b-2 border-[#832729] font-bold'
                    : 'text-[#736862]'
                }`}
              >
                INVITED
              </button>
              <button
                onClick={() => setActiveTab('INACTIVE')}
                className={`pb-1 transition ${
                  activeTab === 'INACTIVE'
                    ? 'text-[#832729] border-b-2 border-[#832729] font-bold'
                    : 'text-[#736862]'
                }`}
              >
                INACTIVE
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                className="border border-[#ded5ce] rounded px-2.5 py-1 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              >
                <option value="All shops">All shops</option>
                <option value="Men's Wear">Men's Wear</option>
                <option value="Women's Wear">Women's Wear</option>
                <option value="Kids Wear">Kids Wear</option>
                <option value="Unassigned">Unassigned</option>
              </select>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or phone"
                className="border border-[#ded5ce] rounded px-2.5 py-1 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729] w-36"
              />
            </div>
          </div>

          <div className="overflow-x-auto border-t border-[#f2ede7]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#f0eae3] bg-[#faf7f4] text-[#8b6f66] uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-3">EMPLOYEE</th>
                  <th className="py-3 px-3">SHOP</th>
                  <th className="py-3 px-3">ROLE</th>
                  <th className="py-3 px-3">TODAY</th>
                  <th className="py-3 px-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f7f2ed]">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-[#fdfbfa] transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#f3eae4] text-[#832729] font-bold flex items-center justify-center text-xs shrink-0">
                          {s.initials}
                        </div>
                        <div>
                          <div className="font-semibold text-[#2a2220]">
                            {s.name}
                          </div>
                          <div className="text-[11px] text-[#736862]">
                            {s.empCode} · {s.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#332c28]">{s.shopName}</td>
                    <td className="py-3 px-3 text-[#554e48]">{s.role}</td>
                    <td className="py-3 px-3 text-[#554e48] font-mono text-[11px]">
                      {s.todayAttendance}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {getStatusBadge(s.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-[#736862] pt-2">
            <span>1–8 of 15</span>
            <span>Page 1 of 2</span>
          </div>
        </div>

        {/* Right: Invite Employee Form */}
        <div className="lg:col-span-4 bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm space-y-4">
          <h3
            className="text-base font-serif font-semibold text-[#2a2220]"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            Invite employee
          </h3>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              FULL NAME *
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
              MOBILE *
            </label>
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="+91"
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              EMAIL (LOGIN) *
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
              SHOP *
            </label>
            <select
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            >
              <option value="Men's Wear">Men's Wear</option>
              <option value="Women's Wear">Women's Wear</option>
              <option value="Kids Wear">Kids Wear</option>
              <option value="Unassigned">Unassigned</option>
            </select>
            <span className="text-[10px] text-[#8b6f66] mt-0.5 block">
              Only shops in your branch
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              ROLE *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            >
              <option value="Sales associate">Sales associate</option>
              <option value="Cashier">Cashier</option>
              <option value="Shop manager">Shop manager</option>
              <option value="Stock keeper">Stock keeper</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              JOINING DATE *
            </label>
            <input
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              SHIFT
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            >
              <option value="Morning">Morning</option>
              <option value="Evening">Evening</option>
              <option value="Full day">Full day</option>
            </select>
          </div>

          <div>
            <div className="text-[10px] font-bold text-[#736862] tracking-wider uppercase mb-1.5">
              PERMISSIONS (FROM ROLE)
            </div>
            <div className="space-y-1.5 text-xs text-[#2a2220]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permPos}
                  onChange={(e) => setPermPos(e.target.checked)}
                  className="accent-[#832729] rounded"
                />
                <span>POS billing</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permCredit}
                  onChange={(e) => setPermCredit(e.target.checked)}
                  className="accent-[#832729] rounded"
                />
                <span>Credit (udhaar) sales</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permReceive}
                  onChange={(e) => setPermReceive(e.target.checked)}
                  className="accent-[#832729] rounded"
                />
                <span>Receive stock</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permStock}
                  onChange={(e) => setPermStock(e.target.checked)}
                  className="accent-[#832729] rounded"
                />
                <span>Stock adjustment</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permReturn}
                  onChange={(e) => setPermReturn(e.target.checked)}
                  className="accent-[#832729] rounded"
                />
                <span>Create returns</span>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSendInvite}
              disabled={inviteMutation.isPending}
              className="w-full bg-[#7a2222] hover:bg-[#681c1c] text-white text-xs font-semibold py-2.5 rounded tracking-wider uppercase transition shadow-sm disabled:opacity-50"
            >
              {inviteMutation.isPending ? 'SENDING...' : 'SEND INVITATION'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

