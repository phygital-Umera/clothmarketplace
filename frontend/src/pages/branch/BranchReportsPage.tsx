import {useState} from 'react';
import {useBranchPnlReport} from '@/lib/react-query/queriesAndMutations/branchExtras';
import {FileSpreadsheet, FileText} from 'lucide-react';
import toast from 'react-hot-toast';

const inr = (n?: number | null) => {
  if (n === undefined || n === null) return '—';
  if (n === 0) return '—';
  if (n < 0) return `-₹${Math.abs(n).toLocaleString('en-IN')}`;
  return `₹${Number(n).toLocaleString('en-IN')}`;
};

export default function BranchReportsPage() {
  const [fromDate, setFromDate] = useState('2026-11-01');
  const [toDate, setToDate] = useState('2026-11-03');
  const [activeReport, setActiveReport] = useState('Shop-wise P&L');

  const {data} = useBranchPnlReport(fromDate, toDate);

  const rows = data?.rows || [
    {
      line: 'Net sales (ex GST)',
      mens: 76380,
      womens: 88940,
      kids: 20290,
      branch: 0,
      total: 185610,
    },
    {
      line: 'Cost of goods sold',
      mens: -47800,
      womens: -52160,
      kids: -12690,
      branch: 0,
      total: -112650,
      isNegative: true,
    },
    {
      line: 'Gross profit',
      mens: 30580,
      womens: 34780,
      kids: 7600,
      branch: 0,
      total: 72960,
    },
    {
      line: 'Expenses',
      mens: -31650,
      womens: -36950,
      kids: -19000,
      branch: -8800,
      total: -96400,
      isNegative: true,
    },
    {
      line: 'Net profit',
      mens: -1070,
      womens: -2170,
      kids: -11400,
      branch: -8800,
      total: -23440,
      isNegative: true,
    },
  ];

  const margins = data?.margins || [
    {shop: "Men's Wear", margin: 38.0},
    {shop: "Women's Wear", margin: 40.0},
    {shop: 'Kids Wear', margin: 37.5},
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto text-[#2b2b2b]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66] mb-1">
            REPORTS
          </div>
          <h1
            className="text-3xl font-serif text-[#2a2220] tracking-tight"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            Branch reports
          </h1>
          <p className="text-sm text-[#736862] mt-1">
            Compare shops on sales, profit, stock and dues.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => toast.success('Exporting to Excel...')}
            className="inline-flex items-center gap-1.5 border border-[#832729] text-[#832729] px-3.5 py-1.5 rounded text-xs font-semibold tracking-wider uppercase hover:bg-[#832729]/5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            EXCEL
          </button>
          <button
            onClick={() => toast.success('Exporting to PDF...')}
            className="inline-flex items-center gap-1.5 border border-[#832729] text-[#832729] px-3.5 py-1.5 rounded text-xs font-semibold tracking-wider uppercase hover:bg-[#832729]/5 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            PDF
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border border-[#ded5ce] rounded px-3 py-1.5 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border border-[#ded5ce] rounded px-3 py-1.5 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
        />
        <button
          onClick={() => toast.success('Report updated')}
          className="bg-[#7a2222] hover:bg-[#681c1c] text-white px-4 py-1.5 rounded text-xs font-semibold tracking-wider uppercase transition shadow-sm"
        >
          SHOW
        </button>
      </div>

      {/* Grid: Left Navigation Menu & Right Report Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Report categories menu */}
        <div className="lg:col-span-3 bg-white border border-[#efe9e3] rounded-lg p-3 space-y-4 shadow-sm text-xs">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8b6f66] px-2 mb-1.5">
              SALES
            </div>
            <div className="space-y-0.5">
              {[
                'Shop comparison',
                'Sales by cashier',
                'Sales by item / size',
                'Payment modes',
              ].map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveReport(item)}
                  className={`w-full text-left px-2.5 py-1.5 rounded transition ${
                    activeReport === item
                      ? 'bg-[#fbf3ef] text-[#832729] font-bold border-l-2 border-[#832729]'
                      : 'text-[#554e48] hover:bg-[#faf7f4]'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8b6f66] px-2 mb-1.5">
              PROFIT
            </div>
            <div className="space-y-0.5">
              {['Shop-wise P&L', 'Item-wise profit'].map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveReport(item)}
                  className={`w-full text-left px-2.5 py-1.5 rounded transition ${
                    activeReport === item
                      ? 'bg-[#fbf3ef] text-[#832729] font-bold border-l-2 border-[#832729]'
                      : 'text-[#554e48] hover:bg-[#faf7f4]'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8b6f66] px-2 mb-1.5">
              STOCK
            </div>
            <div className="space-y-0.5">
              {['Stock by shop', 'Slow movers', 'Stock count variance'].map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveReport(item)}
                  className={`w-full text-left px-2.5 py-1.5 rounded transition ${
                    activeReport === item
                      ? 'bg-[#fbf3ef] text-[#832729] font-bold border-l-2 border-[#832729]'
                      : 'text-[#554e48] hover:bg-[#faf7f4]'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8b6f66] px-2 mb-1.5">
              DUES
            </div>
            <div className="space-y-0.5">
              {['Customer outstanding', 'Supplier payable'].map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveReport(item)}
                  className={`w-full text-left px-2.5 py-1.5 rounded transition ${
                    activeReport === item
                      ? 'bg-[#fbf3ef] text-[#832729] font-bold border-l-2 border-[#832729]'
                      : 'text-[#554e48] hover:bg-[#faf7f4]'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8b6f66] px-2 mb-1.5">
              CONTROL
            </div>
            <div className="space-y-0.5">
              {['Discounts given', 'Cancelled / edited bills', 'Cash differences'].map(
                (item) => (
                  <button
                    key={item}
                    onClick={() => setActiveReport(item)}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition ${
                      activeReport === item
                        ? 'bg-[#fbf3ef] text-[#832729] font-bold border-l-2 border-[#832729]'
                        : 'text-[#554e48] hover:bg-[#faf7f4]'
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Report Content */}
        <div className="lg:col-span-9 space-y-6">
          {/* Main Table: Shop-wise P&L */}
          <div className="bg-white border border-[#efe9e3] rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#f2ede7]">
              <h2
                className="text-base font-serif text-[#2a2220] font-semibold tracking-wide"
                style={{fontFamily: "'Playfair Display', Georgia, serif"}}
              >
                Shop-wise profit & loss · 1-3 Nov 2026
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#f0eae3] bg-[#faf7f4] text-[#8b6f66] uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-3 px-4">LINE</th>
                    <th className="py-3 px-4 text-right">MEN'S</th>
                    <th className="py-3 px-4 text-right">WOMEN'S</th>
                    <th className="py-3 px-4 text-right">KIDS</th>
                    <th className="py-3 px-4 text-right">BRANCH</th>
                    <th className="py-3 px-4 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f7f2ed]">
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      className={`hover:bg-[#fdfbfa] transition-colors ${
                        r.line === 'Net profit'
                          ? 'bg-[#fdfbf9] font-bold text-[#c23a3a]'
                          : r.line === 'Gross profit'
                          ? 'font-bold text-[#2a2220]'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-[#2a2220]">
                        {r.line}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {inr(r.mens)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {inr(r.womens)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {inr(r.kids)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {inr(r.branch)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono ${
                          r.isNegative ? 'text-[#c23a3a]' : 'text-[#2a2220]'
                        }`}
                      >
                        {inr(r.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#faf7f4] border-t border-[#f2ede7] text-[11px] text-[#736862] italic">
              Rent and October salaries are booked on 1 Nov, so early-month net profit is negative. Full-month view evens out.
            </div>
          </div>

          {/* Bottom Card: Gross margin by shop */}
          <div className="bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm space-y-4">
            <h3
              className="text-base font-serif font-semibold text-[#2a2220]"
              style={{fontFamily: "'Playfair Display', Georgia, serif"}}
            >
              Gross margin by shop
            </h3>

            <div className="space-y-3 max-w-xl">
              {margins.map((m) => (
                <div key={m.shop} className="flex items-center gap-4 text-xs">
                  <span className="w-28 text-[#554e48] font-medium">{m.shop}</span>
                  <div className="flex-1 bg-[#f5ede7] h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-[#7a2222] h-full rounded-full"
                      style={{width: `${m.margin}%`}}
                    />
                  </div>
                  <span className="w-12 text-right font-bold text-[#2a2220]">
                    {m.margin.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

