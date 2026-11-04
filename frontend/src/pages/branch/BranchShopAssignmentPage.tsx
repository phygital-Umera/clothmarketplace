import {useState} from 'react';
import {
  useBranchShopAssignment,
  useMoveBranchEmployee,
} from '@/lib/react-query/queriesAndMutations/branchExtras';
import {ArrowLeftRight, CheckCircle2} from 'lucide-react';
import toast from 'react-hot-toast';

export default function BranchShopAssignmentPage() {
  const {data} = useBranchShopAssignment();
  const moveMutation = useMoveBranchEmployee();

  // Move employee form state
  const [employee, setEmployee] = useState('Akash Lohar — Unassigned');
  const [targetShop, setTargetShop] = useState("Men's Wear");
  const [roleInShop, setRoleInShop] = useState('Sales associate');
  const [effectiveFrom, setEffectiveFrom] = useState('2026-11-04');
  const [reason, setReason] = useState('');

  const groups = data?.groups || [
    {
      shopName: "Men's Wear",
      shopCode: 'MAT-B02-S01',
      staffCount: 5,
      manager: 'Rahul Mane',
      staff: [
        {id: '1', name: 'Sagar Jadhav', initials: 'SJ', role: 'Cashier', shopName: "Men's Wear"},
        {id: '2', name: 'Ganesh Patil', initials: 'GP', role: 'Sales associate', shopName: "Men's Wear"},
        {id: '3', name: 'Mahesh Shinde', initials: 'MS', role: 'Sales associate', shopName: "Men's Wear"},
        {id: '4', name: 'Tushar Mali', initials: 'TM', role: 'Stock keeper', shopName: "Men's Wear"},
      ],
    },
    {
      shopName: "Women's Wear",
      shopCode: 'MAT-B02-S02',
      staffCount: 6,
      manager: 'Priya Shinde',
      staff: [
        {id: '5', name: 'Pallavi Kale', initials: 'PK', role: 'Sales associate', shopName: "Women's Wear"},
        {id: '6', name: 'Rutuja Pawar', initials: 'RP', role: 'Cashier', shopName: "Women's Wear"},
        {id: '7', name: 'Shital Mane', initials: 'SM', role: 'Sales associate', shopName: "Women's Wear"},
        {id: '8', name: 'Komal Desai', initials: 'KD', role: 'Sales associate', shopName: "Women's Wear"},
        {id: '9', name: 'Aarti Sutar', initials: 'AS', role: 'Stock keeper', shopName: "Women's Wear"},
      ],
    },
    {
      shopName: 'Kids Wear',
      shopCode: 'MAT-B02-S03',
      staffCount: 3,
      manager: 'Not assigned',
      staff: [
        {id: '10', name: 'Kiran More', initials: 'KM', role: 'Cashier', shopName: 'Kids Wear'},
        {id: '11', name: 'Pooja Kamble', initials: 'PK', role: 'Sales associate', shopName: 'Kids Wear'},
        {id: '12', name: 'Vaibhav Nikam', initials: 'VN', role: 'Stock keeper', shopName: 'Kids Wear'},
      ],
    },
    {
      shopName: 'Unassigned',
      shopCode: 'Branch pool',
      staffCount: 1,
      manager: '—',
      staff: [
        {id: '13', name: 'Akash Lohar', initials: 'AL', role: 'New joiner', shopName: 'Unassigned'},
      ],
    },
  ];

  const history = data?.history || [
    {
      id: '1',
      employee: 'Kiran More',
      fromTo: '— → Kids Wear',
      role: 'Cashier',
      date: '02 Nov 2026',
      by: 'Snehal Kulkarni',
    },
    {
      id: '2',
      employee: 'Pallavi Kale',
      fromTo: "Men's Wear → Women's Wear",
      role: 'Sales associate',
      date: '02 Nov 2026',
      by: 'Snehal Kulkarni',
    },
    {
      id: '3',
      employee: 'Priya Shinde',
      fromTo: "— → Women's Wear",
      role: 'Shop manager',
      date: '01 Nov 2026',
      by: 'Matoshri Admin',
    },
  ];

  const handleSaveAssignment = async () => {
    await moveMutation.mutateAsync({
      employeeName: employee,
      targetShop,
      roleInShop,
      effectiveFrom,
      reason: reason.trim() || undefined,
    });
    setReason('');
  };

  const handleQuickMove = (staffName: string, currentShop: string) => {
    setEmployee(`${staffName} — ${currentShop}`);
    const nextShop = currentShop === "Men's Wear" ? "Women's Wear" : "Men's Wear";
    setTargetShop(nextShop);
    window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});
    toast(`Selected ${staffName} for relocation below`);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto text-[#2b2b2b]">
      {/* Header */}
      <div>
        <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66] mb-1">
          MY BRANCH / SHOP ASSIGNMENT
        </div>
        <h1
          className="text-3xl font-serif text-[#2a2220] tracking-tight"
          style={{fontFamily: "'Playfair Display', Georgia, serif"}}
        >
          Shop assignment
        </h1>
        <p className="text-sm text-[#736862] mt-1">
          Who works in which shop. Each employee belongs to one shop at a time.
        </p>
      </div>

      {/* 4 Shop Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {groups.map((g) => (
          <div
            key={g.shopName}
            className="bg-white border border-[#efe9e3] rounded-lg p-4 shadow-sm space-y-3"
          >
            {/* Shop title & code */}
            <div>
              <h3 className="text-base font-semibold text-[#2a2220]">
                {g.shopName}
              </h3>
              <div className="text-[11px] text-[#736862] mt-0.5">
                {g.shopCode} · {g.staffCount} staff
              </div>
            </div>

            {/* Shop Manager Box */}
            <div className="bg-[#faf7f4] border border-[#f0eae3] p-2.5 rounded flex items-center justify-between text-xs">
              <div>
                <div className="text-[9px] font-bold text-[#8b6f66] uppercase tracking-wider">
                  SHOP MANAGER
                </div>
                <div className="font-semibold text-[#2a2220] mt-0.5 truncate max-w-[110px]">
                  {g.manager}
                </div>
              </div>
              <button
                onClick={() => toast(`Change manager for ${g.shopName}`)}
                className="border border-[#ded5ce] text-[#736862] hover:text-[#2a2220] px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-white hover:bg-[#faf7f4]"
              >
                {g.manager === '—' || g.manager === 'Not assigned' ? 'ASSIGN' : 'CHANGE'}
              </button>
            </div>

            {/* Staff list */}
            <div className="space-y-1.5 pt-1">
              {g.staff.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-[#faf7f4] transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#f3eae4] text-[#832729] font-bold flex items-center justify-center text-[10px] shrink-0">
                      {s.initials}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#2a2220]">
                        {s.name}
                      </div>
                      <div className="text-[10px] text-[#736862]">{s.role}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickMove(s.name, g.shopName)}
                    title="Move / Reassign employee"
                    className="text-[#736862] hover:text-[#832729] p-1 rounded hover:bg-white"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Grid: Move/assign employee form & Assignment history table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Move / assign employee */}
        <div className="lg:col-span-5 bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm space-y-4">
          <h3
            className="text-base font-serif font-semibold text-[#2a2220]"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            Move / assign employee
          </h3>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              EMPLOYEE *
            </label>
            <select
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            >
              <option value="Akash Lohar — Unassigned">Akash Lohar — Unassigned</option>
              <option value="Sagar Jadhav — Men's Wear">Sagar Jadhav — Men's Wear</option>
              <option value="Ganesh Patil — Men's Wear">Ganesh Patil — Men's Wear</option>
              <option value="Mahesh Shinde — Men's Wear">Mahesh Shinde — Men's Wear</option>
              <option value="Tushar Mali — Men's Wear">Tushar Mali — Men's Wear</option>
              <option value="Pallavi Kale — Women's Wear">Pallavi Kale — Women's Wear</option>
              <option value="Rutuja Pawar — Women's Wear">Rutuja Pawar — Women's Wear</option>
              <option value="Shital Mane — Women's Wear">Shital Mane — Women's Wear</option>
              <option value="Komal Desai — Women's Wear">Komal Desai — Women's Wear</option>
              <option value="Aarti Sutar — Women's Wear">Aarti Sutar — Women's Wear</option>
              <option value="Kiran More — Kids Wear">Kiran More — Kids Wear</option>
              <option value="Pooja Kamble — Kids Wear">Pooja Kamble — Kids Wear</option>
              <option value="Vaibhav Nikam — Kids Wear">Vaibhav Nikam — Kids Wear</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              ASSIGN TO SHOP *
            </label>
            <select
              value={targetShop}
              onChange={(e) => setTargetShop(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            >
              <option value="Men's Wear">Men's Wear</option>
              <option value="Women's Wear">Women's Wear</option>
              <option value="Kids Wear">Kids Wear</option>
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              ROLE IN SHOP *
            </label>
            <select
              value={roleInShop}
              onChange={(e) => setRoleInShop(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            >
              <option value="Sales associate">Sales associate</option>
              <option value="Cashier">Cashier</option>
              <option value="Shop manager">Shop manager</option>
              <option value="Stock keeper">Stock keeper</option>
              <option value="New joiner">New joiner</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              EFFECTIVE FROM *
            </label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              REASON
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Festive rush at Women's Wear"
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleSaveAssignment}
              disabled={moveMutation.isPending}
              className="w-full bg-[#7a2222] hover:bg-[#681c1c] text-white text-xs font-semibold py-2.5 rounded tracking-wider uppercase transition shadow-sm disabled:opacity-50"
            >
              {moveMutation.isPending ? 'SAVING...' : 'SAVE ASSIGNMENT'}
            </button>
          </div>
        </div>

        {/* Right: Assignment history */}
        <div className="lg:col-span-7 bg-white border border-[#efe9e3] rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#f2ede7]">
            <h3
              className="text-base font-serif font-semibold text-[#2a2220]"
              style={{fontFamily: "'Playfair Display', Georgia, serif"}}
            >
              Assignment history
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#f0eae3] bg-[#faf7f4] text-[#8b6f66] uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">EMPLOYEE</th>
                  <th className="py-3 px-4">FROM → TO</th>
                  <th className="py-3 px-4">ROLE</th>
                  <th className="py-3 px-4">DATE</th>
                  <th className="py-3 px-4">BY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f7f2ed]">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-[#fdfbfa] transition">
                    <td className="py-3 px-4 font-semibold text-[#2a2220]">
                      {h.employee}
                    </td>
                    <td className="py-3 px-4 text-[#554e48]">{h.fromTo}</td>
                    <td className="py-3 px-4 text-[#554e48]">{h.role}</td>
                    <td className="py-3 px-4 text-[#554e48] font-mono text-[11px]">
                      {h.date}
                    </td>
                    <td className="py-3 px-4 text-[#736862] text-[11px]">
                      {h.by}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

