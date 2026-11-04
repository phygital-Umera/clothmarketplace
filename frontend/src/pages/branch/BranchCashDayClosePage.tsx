import {useState, useEffect} from 'react';
import {
  useDayCloseData,
  useResolveDifference,
  useRecordBankDeposit,
} from '@/lib/react-query/queriesAndMutations/dayClose';
import {DayCloseShop} from '@/lib/api/dayClose';
import {Upload, CheckCircle2, AlertCircle, RefreshCw} from 'lucide-react';
import toast from 'react-hot-toast';

const inr = (n?: number | null) =>
  n === undefined || n === null
    ? '—'
    : `₹${Number(n).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

export default function BranchCashDayClosePage() {
  const [selectedDate, setSelectedDate] = useState('2026-11-02');
  const {data, isLoading, isFetching, refetch} = useDayCloseData(selectedDate);

  const resolveDiffMutation = useResolveDifference();
  const recordDepositMutation = useRecordBankDeposit();

  const [selectedShopName, setSelectedShopName] = useState<string>("Men's Wear");

  const shops: DayCloseShop[] = data?.shops || [
    {
      id: '1',
      shopName: "Men's Wear",
      closedBy: 'Sagar Jadhav\n9:12 PM',
      opening: 1000,
      cashSales: 4180,
      duesCollected: 500,
      cashOut: 600,
      expected: 5080,
      counted: 4880,
      diff: -200,
      status: 'NEEDS_REVIEW',
      reason: 'Change given wrongly',
      action: 'Write off as cash short',
      note: 'Sagar says ₹200 change given twice at 6 PM rush',
    },
    {
      id: '2',
      shopName: "Women's Wear",
      closedBy: 'Rutuja Pawar\n9:05 PM',
      opening: 1000,
      cashSales: 6150,
      duesCollected: 2000,
      cashOut: 900,
      expected: 8250,
      counted: 8250,
      diff: 0,
      status: 'ACCEPTED',
    },
    {
      id: '3',
      shopName: 'Kids Wear',
      closedBy: 'Kiran More\n8:58 PM',
      opening: 1000,
      cashSales: 2010,
      duesCollected: 0,
      cashOut: 200,
      expected: 2810,
      counted: 2810,
      diff: 0,
      status: 'ACCEPTED',
    },
  ];

  // Active review shop
  const activeShop =
    shops.find((s) => s.shopName === selectedShopName) ||
    data?.reviewItem ||
    shops.find((s) => s.diff !== 0) ||
    shops[0];

  // Explain difference form state
  const [reason, setReason] = useState(activeShop?.reason || 'Change given wrongly');
  const [action, setAction] = useState(activeShop?.action || 'Write off as cash short');
  const [note, setNote] = useState(
    activeShop?.note || 'Sagar says ₹200 change given twice at 6 PM rush',
  );

  // Bank deposit form state
  const [depositAmount, setDepositAmount] = useState<number | string>(
    data?.summary?.toBank ?? 12940,
  );
  const [selectedBank, setSelectedBank] = useState('HDFC current ••4417');
  const [depositSlipUtr, setDepositSlipUtr] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);

  // Sync state whenever data arrives or selected shop changes
  useEffect(() => {
    if (activeShop) {
      setReason(activeShop.reason || 'Change given wrongly');
      setAction(activeShop.action || 'Write off as cash short');
      setNote(activeShop.note || 'Sagar says ₹200 change given twice at 6 PM rush');
    }
  }, [activeShop?.shopName, activeShop?.status, activeShop?.note]);

  useEffect(() => {
    if (data?.summary?.toBank !== undefined) {
      setDepositAmount(data.summary.toBank);
    }
  }, [data?.summary?.toBank]);

  const handleAcceptDayClose = async () => {
    if (!activeShop) {
      toast.error('No shop selected');
      return;
    }
    await resolveDiffMutation.mutateAsync({
      shopName: activeShop.shopName,
      date: selectedDate,
      reason,
      action,
      note,
    });
  };

  const handleRecordDeposit = async () => {
    const amt = Number(depositAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid deposit amount');
      return;
    }
    await recordDepositMutation.mutateAsync({
      amount: amt,
      bank: selectedBank,
      depositSlipUtr: depositSlipUtr || undefined,
      date: selectedDate,
    });
  };

  const summary = data?.summary || {
    cashSales: 12340,
    countersCount: 3,
    counted: 15940,
    openingFloats: 3000,
    difference: -200,
    differenceShop: "Men's Wear — explain",
    toBank: 12940,
    depositStatus: 'Deposit slip pending',
  };

  const totals = data?.totals || {
    opening: 3000,
    cashSales: 12340,
    duesCollected: 2500,
    cashOut: 1700,
    expected: 16140,
    counted: 15940,
    diff: -200,
  };

  // Format short date (e.g. "2 NOV") and long date (e.g. "Mon, 2 Nov 2026")
  const dateObj = new Date(selectedDate);
  const formattedShortDate = isNaN(dateObj.getTime())
    ? '2 NOV'
    : dateObj
        .toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})
        .toUpperCase();

  const formattedLongDate = isNaN(dateObj.getTime())
    ? 'Mon, 2 Nov 2026'
    : dateObj.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto text-[#2b2b2b]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66] mb-1">
            ACCOUNTS / CASH & DAY CLOSE
          </div>
          <h1
            className="text-3xl font-serif text-[#2a2220] tracking-tight"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            Cash & day close
          </h1>
          <p className="text-sm text-[#736862] mt-1">
            Each shop closes its counter at night. You check differences and record cash handed over or deposited.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 self-start">
          <div className="relative inline-flex items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-[#e4dcd6] rounded px-3 py-1.5 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729] shadow-sm font-medium pr-3 cursor-pointer"
            />
          </div>
          <button
            onClick={() => refetch()}
            title="Refresh"
            className="p-1.5 text-[#736862] hover:text-[#2a2220] rounded border border-[#e4dcd6] bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-[#efe9e3] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66]">
            CASH SALES ({formattedShortDate})
          </div>
          <div
            className="text-2xl font-serif font-semibold text-[#2a2220] mt-1"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {inr(summary.cashSales)}
          </div>
          <div className="text-xs text-[#736862] mt-1 font-sans">
            {summary.countersCount} counters
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-[#efe9e3] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66]">
            COUNTED
          </div>
          <div
            className="text-2xl font-serif font-semibold text-[#2a2220] mt-1"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {inr(summary.counted)}
          </div>
          <div className="text-xs text-[#736862] mt-1 font-sans">
            Incl. {inr(summary.openingFloats)} opening floats
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-[#efe9e3] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66]">
            DIFFERENCE
          </div>
          <div
            className={`text-2xl font-serif font-semibold mt-1 ${
              summary.difference < 0 ? 'text-[#c23a3a]' : 'text-[#2a2220]'
            }`}
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {summary.difference < 0
              ? `-₹${Math.abs(summary.difference).toLocaleString('en-IN')}`
              : inr(summary.difference)}
          </div>
          <div className="text-xs text-[#736862] mt-1 font-sans">
            {summary.differenceShop || "Men's Wear — explain"}
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-[#efe9e3] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66]">
            TO BANK
          </div>
          <div
            className="text-2xl font-serif font-semibold text-[#2a2220] mt-1"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {inr(summary.toBank)}
          </div>
          <div className="text-xs text-[#736862] mt-1 font-sans">
            {summary.depositStatus}
          </div>
        </div>
      </div>

      {/* Main Table: Day close by shop */}
      <div className="bg-white border border-[#efe9e3] rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#f2ede7] flex items-center justify-between">
          <h2
            className="text-base font-serif text-[#2a2220] font-semibold tracking-wide"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            Day close by shop · {formattedLongDate}
          </h2>
          <span className="text-[11px] text-[#8b6f66]">
            Click row to explain difference
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#f0eae3] bg-[#faf7f4] text-[#8b6f66] uppercase text-[10px] font-semibold tracking-wider">
                <th className="py-3 px-4">SHOP</th>
                <th className="py-3 px-4">CLOSED BY</th>
                <th className="py-3 px-4 text-right">OPENING</th>
                <th className="py-3 px-4 text-right">CASH SALES</th>
                <th className="py-3 px-4 text-right">DUES COLLECTED</th>
                <th className="py-3 px-4 text-right">CASH OUT</th>
                <th className="py-3 px-4 text-right">EXPECTED</th>
                <th className="py-3 px-4 text-right">COUNTED</th>
                <th className="py-3 px-4 text-right">DIFF.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f7f2ed]">
              {shops.map((s) => {
                const isSelected = activeShop?.shopName === s.shopName;
                return (
                  <tr
                    key={s.id || s.shopName}
                    onClick={() => setSelectedShopName(s.shopName)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#fbf3ef]' : 'hover:bg-[#fdfbfa]'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-[#2a2220]">
                      <div className="flex items-center gap-2">
                        {s.diff !== 0 && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.status === 'ACCEPTED'
                                ? 'bg-emerald-500'
                                : 'bg-[#c23a3a]'
                            }`}
                          />
                        )}
                        <span>{s.shopName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#554e48] whitespace-pre-line leading-relaxed">
                      {s.closedBy}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#332c28] font-mono">
                      {inr(s.opening)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#332c28] font-mono">
                      {inr(s.cashSales)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#332c28] font-mono">
                      {inr(s.duesCollected)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#332c28] font-mono">
                      {inr(s.cashOut)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#332c28] font-mono">
                      {inr(s.expected)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#332c28] font-mono">
                      {inr(s.counted)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium">
                      {s.diff < 0 ? (
                        <span className="text-[#c23a3a] font-semibold">
                          -₹{Math.abs(s.diff).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-[#2a2220]">₹{s.diff}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#e8dfd8] bg-[#fdfbf9] font-semibold text-[#2a2220]">
                <td className="py-3 px-4 text-[#2a2220]">Branch total</td>
                <td className="py-3 px-4"></td>
                <td className="py-3 px-4 text-right font-mono">{inr(totals.opening)}</td>
                <td className="py-3 px-4 text-right font-mono">{inr(totals.cashSales)}</td>
                <td className="py-3 px-4 text-right font-mono">{inr(totals.duesCollected)}</td>
                <td className="py-3 px-4 text-right font-mono">{inr(totals.cashOut)}</td>
                <td className="py-3 px-4 text-right font-mono">{inr(totals.expected)}</td>
                <td className="py-3 px-4 text-right font-mono">{inr(totals.counted)}</td>
                <td className="py-3 px-4 text-right font-mono text-[#c23a3a]">
                  {totals.diff < 0
                    ? `-₹${Math.abs(totals.diff).toLocaleString('en-IN')}`
                    : inr(totals.diff)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Bottom Section: Explain Difference & Bank Deposit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Explain Difference */}
        <div className="bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3
              className="text-base font-serif font-semibold text-[#2a2220]"
              style={{fontFamily: "'Playfair Display', Georgia, serif"}}
            >
              {activeShop?.shopName || "Men's Wear"} — explain difference
            </h3>
            {activeShop?.status === 'ACCEPTED' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                ACCEPTED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
                NEEDS REVIEW
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                REASON
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              >
                <option value="Change given wrongly">Change given wrongly</option>
                <option value="Cash counting error">Cash counting error</option>
                <option value="Petty cash not recorded">Petty cash not recorded</option>
                <option value="Theft or shortage">Theft or shortage</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                ACTION
              </label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              >
                <option value="Write off as cash short">Write off as cash short</option>
                <option value="Recover from cashier">Recover from cashier</option>
                <option value="Adjust in next day close">Adjust in next day close</option>
                <option value="Escalate to Company Admin">Escalate to Company Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              NOTE
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add explanation note..."
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleAcceptDayClose}
              disabled={resolveDiffMutation.isPending}
              className="bg-[#7a2222] hover:bg-[#681c1c] text-white text-xs font-semibold px-5 py-2.5 rounded tracking-wider uppercase transition shadow-sm disabled:opacity-50"
            >
              {resolveDiffMutation.isPending
                ? 'ACCEPTING...'
                : activeShop?.status === 'ACCEPTED'
                ? 'UPDATE DAY CLOSE'
                : 'ACCEPT DAY CLOSE'}
            </button>
          </div>
        </div>

        {/* Right Card: Bank Deposit */}
        <div className="bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3
              className="text-base font-serif font-semibold text-[#2a2220]"
              style={{fontFamily: "'Playfair Display', Georgia, serif"}}
            >
              Bank deposit
            </h3>
            {summary.depositStatus === 'Deposited' && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Deposited
              </span>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              AMOUNT
            </label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              BANK
            </label>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            >
              <option value="HDFC current ••4417">HDFC current ••4417</option>
              <option value="SBI current ••8892">SBI current ••8892</option>
              <option value="ICICI branch account ••1024">ICICI branch account ••1024</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              DEPOSIT SLIP / UTR
            </label>
            <input
              type="text"
              value={depositSlipUtr}
              onChange={(e) => setDepositSlipUtr(e.target.value)}
              placeholder="e.g. UTR / Deposit challan number"
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              SLIP PHOTO
            </label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#ded5ce] rounded p-3 cursor-pointer hover:bg-[#faf7f4] transition text-center">
              <Upload className="w-4 h-4 text-[#736862] mb-1" />
              <span className="text-xs text-[#736862]">
                {slipFile ? slipFile.name : 'Upload'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setSlipFile(e.target.files[0]);
                    toast.success(`Attached ${e.target.files[0].name}`);
                  }
                }}
              />
            </label>
          </div>

          <div className="pt-2">
            <button
              onClick={handleRecordDeposit}
              disabled={recordDepositMutation.isPending}
              className="w-full bg-[#7a2222] hover:bg-[#681c1c] text-white text-xs font-semibold py-2.5 rounded tracking-wider uppercase transition shadow-sm disabled:opacity-50"
            >
              {recordDepositMutation.isPending ? 'RECORDING...' : 'RECORD DEPOSIT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
