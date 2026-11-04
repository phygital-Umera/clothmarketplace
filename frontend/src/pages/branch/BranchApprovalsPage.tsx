import {useState} from 'react';
import {
  useBranchApprovals,
  useDecideBranchApproval,
} from '@/lib/react-query/queriesAndMutations/branchExtras';
import {
  Percent,
  FileText,
  X,
  Package,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function BranchApprovalsPage() {
  const [activeTab, setActiveTab] = useState<string>('PENDING');
  const {data, isLoading} = useBranchApprovals(activeTab === 'PENDING' ? undefined : activeTab);
  const decideMutation = useDecideBranchApproval();

  const counts = data?.counts || {
    pending: 5,
    discount: 1,
    credit: 1,
    cancelBill: 1,
    writeOff: 1,
    refund: 1,
    doneToday: 7,
  };

  const items = data?.items || [
    {
      id: '1',
      type: 'DISCOUNT',
      title: '15% on bill WW/26-27/00236',
      description: 'Banarasi Silk Saree ₹4,999 — small mark on border. Cashier limit 5%.',
      shopAndStaff: "Women's Wear · Rutuja Pawar · 10 min ago",
      amountLabel: '₹750 off',
      amount: 750,
      status: 'PENDING',
    },
    {
      id: '2',
      type: 'CREDIT',
      title: 'Patil Uniforms — bill on credit',
      description: 'Due ₹8,200 (₹6,300 is 34 days old). New bill ₹6,400 -> ₹14,600 vs limit ₹10,000',
      shopAndStaff: "Men's Wear · Rahul Mane · 25 min ago",
      amountLabel: '₹6,400',
      amount: 6400,
      status: 'PENDING',
    },
    {
      id: '3',
      type: 'CANCEL_BILL',
      title: 'MW/26-27/00188',
      description: 'Wrong size billed; customer took a different item on MW/26-27/00189.',
      shopAndStaff: "Men's Wear · Sagar Jadhav · 1 h ago",
      amountLabel: '₹1,499',
      amount: 1499,
      status: 'PENDING',
    },
    {
      id: '4',
      type: 'WRITE_OFF',
      title: '4 damaged pcs — ADJ-0019',
      description: 'Kids Party Frock 6Y x2, 8Y x2 — tears from display hooks. Photos attached.',
      shopAndStaff: 'Kids Wear · Kiran More · today',
      amountLabel: '₹1,120 cost',
      amount: 1120,
      status: 'PENDING',
    },
    {
      id: '5',
      type: 'REFUND',
      title: 'CN/26-27/0011',
      description: 'Linen Blazer 40 — lining torn. Paid cash on 29 Oct.',
      shopAndStaff: "Men's Wear · Sagar Jadhav · today",
      amountLabel: '₹2,499',
      amount: 2499,
      status: 'PENDING',
    },
  ];

  const limitsTable = data?.limitsTable || [
    {action: 'Bill discount', cashierCan: 'Up to 5%', managerCan: 'Up to 10%', aboveThat: 'Branch Admin'},
    {action: 'Credit sale', cashierCan: 'Up to ₹2,000 within limit', managerCan: 'Within customer limit', aboveThat: 'Branch Admin'},
    {action: 'Cancel bill', cashierCan: '—', managerCan: 'Same day, before day close', aboveThat: 'Branch Admin'},
    {action: 'Cash refund', cashierCan: '—', managerCan: 'Up to ₹2,000', aboveThat: 'Branch Admin'},
    {action: 'Stock write-off', cashierCan: '—', managerCan: 'Up to 3 pcs', aboveThat: 'Branch Admin'},
    {action: 'Purchase bill', cashierCan: '—', managerCan: 'Up to ₹50,000', aboveThat: 'Company Admin'},
  ];

  const handleDecision = async (id: string, decision: 'APPROVE' | 'REJECT') => {
    await decideMutation.mutateAsync({id, decision});
  };

  const getPill = (type: string) => {
    switch (type) {
      case 'DISCOUNT':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-[#b45309] bg-[#fef3c7] px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
            DISCOUNT
          </span>
        );
      case 'CREDIT':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-[#c2410c] bg-[#ffedd5] px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c]" />
            CREDIT OVER LIMIT
          </span>
        );
      case 'CANCEL_BILL':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-[#0369a1] bg-[#e0f2fe] px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
            CANCEL BILL
          </span>
        );
      case 'WRITE_OFF':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-[#15803d] bg-[#dcfce7] px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
            STOCK WRITE-OFF
          </span>
        );
      case 'REFUND':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-[#854d0e] bg-[#fef9c3] px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ca8a04]" />
            CASH REFUND
          </span>
        );
      default:
        return null;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'DISCOUNT':
        return <Percent className="w-4 h-4 text-[#d97706]" />;
      case 'CREDIT':
        return <FileText className="w-4 h-4 text-[#ea580c]" />;
      case 'CANCEL_BILL':
        return <X className="w-4 h-4 text-[#0284c7]" />;
      case 'WRITE_OFF':
        return <Package className="w-4 h-4 text-[#16a34a]" />;
      case 'REFUND':
        return <RotateCcw className="w-4 h-4 text-[#ca8a04]" />;
      default:
        return <FileText className="w-4 h-4 text-[#736862]" />;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto text-[#2b2b2b]">
      {/* Header */}
      <div>
        <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66] mb-1">
          OVERVIEW / APPROVALS
        </div>
        <h1
          className="text-3xl font-serif text-[#2a2220] tracking-tight"
          style={{fontFamily: "'Playfair Display', Georgia, serif"}}
        >
          Approvals
        </h1>
        <p className="text-sm text-[#736862] mt-1">
          Things shop staff can't do alone. Each decision is logged with your name and time.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#ded5ce] pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold tracking-wider uppercase rounded transition ${
            activeTab === 'PENDING'
              ? 'text-[#832729] border-b-2 border-[#832729] font-bold'
              : 'text-[#736862] hover:text-[#2a2220]'
          }`}
        >
          <span>PENDING</span>
          <span className="bg-[#832729] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {counts.pending}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('DISCOUNT')}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold tracking-wider uppercase rounded transition ${
            activeTab === 'DISCOUNT'
              ? 'text-[#832729] border-b-2 border-[#832729] font-bold'
              : 'text-[#736862] hover:text-[#2a2220]'
          }`}
        >
          <span>DISCOUNT</span>
          <span className="bg-[#e8dfd8] text-[#554e48] text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {counts.discount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('CREDIT')}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold tracking-wider uppercase rounded transition ${
            activeTab === 'CREDIT'
              ? 'text-[#832729] border-b-2 border-[#832729] font-bold'
              : 'text-[#736862] hover:text-[#2a2220]'
          }`}
        >
          <span>CREDIT</span>
          <span className="bg-[#e8dfd8] text-[#554e48] text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {counts.credit}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('CANCEL_BILL')}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold tracking-wider uppercase rounded transition ${
            activeTab === 'CANCEL_BILL'
              ? 'text-[#832729] border-b-2 border-[#832729] font-bold'
              : 'text-[#736862] hover:text-[#2a2220]'
          }`}
        >
          <span>CANCEL BILL</span>
          <span className="bg-[#e8dfd8] text-[#554e48] text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {counts.cancelBill}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('WRITE_OFF')}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold tracking-wider uppercase rounded transition ${
            activeTab === 'WRITE_OFF'
              ? 'text-[#832729] border-b-2 border-[#832729] font-bold'
              : 'text-[#736862] hover:text-[#2a2220]'
          }`}
        >
          <span>WRITE-OFF</span>
          <span className="bg-[#e8dfd8] text-[#554e48] text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {counts.writeOff}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('REFUND')}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold tracking-wider uppercase rounded transition ${
            activeTab === 'REFUND'
              ? 'text-[#832729] border-b-2 border-[#832729] font-bold'
              : 'text-[#736862] hover:text-[#2a2220]'
          }`}
        >
          <span>REFUND</span>
          <span className="bg-[#e8dfd8] text-[#554e48] text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {counts.refund}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('DONE_TODAY')}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold tracking-wider uppercase rounded transition ${
            activeTab === 'DONE_TODAY'
              ? 'text-[#832729] border-b-2 border-[#832729] font-bold'
              : 'text-[#736862] hover:text-[#2a2220]'
          }`}
        >
          <span>DONE TODAY</span>
          <span className="bg-[#e8dfd8] text-[#554e48] text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {counts.doneToday}
          </span>
        </button>
      </div>

      {/* Approval Cards List */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-[#efe9e3] rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#ded5ce] transition"
          >
            {/* Left Info with Icon */}
            <div className="flex items-start gap-3.5 flex-1">
              <div className="w-9 h-9 rounded bg-[#faf7f4] border border-[#efe9e3] flex items-center justify-center shrink-0 mt-0.5">
                {getIcon(item.type)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getPill(item.type)}
                  <span className="text-sm font-semibold text-[#2a2220]">
                    {item.title}
                  </span>
                </div>
                <p className="text-xs text-[#554e48]">{item.description}</p>
                <div className="text-[11px] text-[#8b6f66]">
                  {item.shopAndStaff}
                </div>
              </div>
            </div>

            {/* Right: Amount & Action Buttons */}
            <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
              <div className="text-right mr-2">
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#8b6f66]">
                  AMOUNT
                </div>
                <div className="text-sm font-bold text-[#2a2220]">
                  {item.amountLabel}
                </div>
              </div>

              {item.status === 'PENDING' ? (
                <>
                  <button
                    onClick={() => toast(`Opening details for ${item.title}`)}
                    className="border border-[#ded5ce] text-[#736862] px-3 py-1.5 rounded text-xs font-semibold tracking-wider uppercase hover:bg-[#faf7f4] transition"
                  >
                    DETAILS
                  </button>
                  <button
                    onClick={() => handleDecision(item.id, 'REJECT')}
                    disabled={decideMutation.isPending}
                    className="border border-[#ded5ce] text-[#832729] px-3 py-1.5 rounded text-xs font-semibold tracking-wider uppercase hover:bg-[#832729]/5 transition"
                  >
                    REJECT
                  </button>
                  <button
                    onClick={() => handleDecision(item.id, 'APPROVE')}
                    disabled={decideMutation.isPending}
                    className="bg-[#7a2222] hover:bg-[#681c1c] text-white px-3.5 py-1.5 rounded text-xs font-semibold tracking-wider uppercase transition shadow-sm"
                  >
                    APPROVE
                  </button>
                </>
              ) : (
                <span
                  className={`px-3 py-1 rounded text-xs font-bold tracking-wider uppercase ${
                    item.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {item.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Card: Approval limits for shop staff */}
      <div className="bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3
            className="text-base font-serif font-semibold text-[#2a2220]"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            Approval limits for shop staff
          </h3>
          <button
            onClick={() => toast.success('Rule editor opened')}
            className="text-xs font-semibold tracking-wider uppercase text-[#832729] hover:underline"
          >
            EDIT RULES
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#f0eae3] bg-[#faf7f4] text-[#8b6f66] uppercase text-[10px] font-semibold tracking-wider">
                <th className="py-2.5 px-4">ACTION</th>
                <th className="py-2.5 px-4">CASHIER CAN</th>
                <th className="py-2.5 px-4">SHOP MANAGER CAN</th>
                <th className="py-2.5 px-4">ABOVE THAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f7f2ed]">
              {limitsTable.map((l, i) => (
                <tr key={i} className="hover:bg-[#fdfbfa]">
                  <td className="py-3 px-4 font-medium text-[#2a2220]">
                    {l.action}
                  </td>
                  <td className="py-3 px-4 text-[#554e48]">{l.cashierCan}</td>
                  <td className="py-3 px-4 text-[#554e48]">{l.managerCan}</td>
                  <td className="py-3 px-4 font-medium text-[#832729]">
                    {l.aboveThat}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

