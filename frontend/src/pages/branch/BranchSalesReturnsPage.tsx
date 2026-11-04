import CreditNoteDetail from '@/components/CreditNotes/CreditNoteDetail';
import CreditNoteTable from '@/components/CreditNotes/CreditNoteTable';
import ListToolbar from '@/components/Org/ListToolbar';
import {KpiCard, PageHeader} from '@/components/ui';
import useListState from '@/hooks/useListState';
import {
  useCreditNote,
  useCreditNotes,
  useCreditNoteSummary,
} from '@/lib/react-query/queriesAndMutations/creditNote';
import {useShopOptions} from '@/lib/react-query/queriesAndMutations/org';
import {CreditNoteTab} from '@/types/creditNote';
import {getErrorMessage} from '@/utils/axios';
import {useEffect, useState} from 'react';

const inr = (n?: number) =>
  n === undefined
    ? '–'
    : `₹${n.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

const monthName = new Date().toLocaleDateString('en-IN', {month: 'short'});

/** Branch admin: returns taken at every shop; cash / large refunds wait here */
export default function BranchSalesReturnsPage() {
  const list = useListState();
  const [tab, setTab] = useState<CreditNoteTab | undefined>();
  const [shopId, setShopId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {data: shops} = useShopOptions('branch-admin');
  const {data: summary} = useCreditNoteSummary({shopId: shopId || undefined});
  const {data, isPending, error} = useCreditNotes('branch-admin', {
    ...list.params,
    tab,
    shopId: shopId || undefined,
  });
  const {data: selected} = useCreditNote(
    'branch-admin',
    selectedId ?? undefined,
  );

  // Keep a note selected: the first one on the page, if none is picked yet
  useEffect(() => {
    const items = data?.items ?? [];
    if (!items.length) setSelectedId(null);
    else if (!items.some((n) => n.id === selectedId))
      setSelectedId(items[0].id);
  }, [data?.items, selectedId]);

  const t = summary?.tabs;
  const limit = summary?.approvalLimit ?? 2000;

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Sales'}, {label: 'Sales returns'}]}
        title="Sales returns & credit notes"
        subtitle={`Returns taken at the shops. Cash refunds and refunds above ₹${limit.toLocaleString('en-IN')} need your approval.`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          label={`Credit notes (${monthName})`}
          value={summary ? String(summary.month.notes) : '–'}
          note={summary && `${inr(summary.month.value)} value`}
        />
        <KpiCard
          label="Exchanged"
          value={summary ? String(summary.month.exchanged) : '–'}
          note="No money out"
          onClick={() => {
            setTab('EXCHANGE');
            list.setPage(1);
          }}
        />
        <KpiCard
          label="Store credit open"
          value={inr(summary?.storeCredit.open)}
          note={
            summary &&
            `${summary.storeCredit.customers} customer${summary.storeCredit.customers === 1 ? '' : 's'}`
          }
          onClick={() => {
            setTab('STORE_CREDIT');
            list.setPage(1);
          }}
        />
        <KpiCard
          label="Refund approvals"
          value={summary ? String(summary.approvals.pending) : '–'}
          tone={summary?.approvals.pending ? 'bad' : 'muted'}
          note={summary && `${inr(summary.approvals.cashPending)} cash`}
          onClick={() => {
            setTab('NEEDS_APPROVAL');
            list.setPage(1);
          }}
        />
        <KpiCard
          label="Return rate"
          value={summary ? `${summary.month.returnRate}%` : '–'}
          tone={summary && summary.month.returnRate > 5 ? 'bad' : 'muted'}
          note="Of sales value this month"
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="panel">
          <div className="p-3">
            <ListToolbar
              tabs={[
                {label: 'All', value: undefined, count: t?.all},
                {
                  label: 'Needs approval',
                  value: 'NEEDS_APPROVAL',
                  count: t?.needsApproval,
                },
                {label: 'Exchange', value: 'EXCHANGE', count: t?.exchange},
                {
                  label: 'Store credit',
                  value: 'STORE_CREDIT',
                  count: t?.storeCredit,
                },
                {label: 'Refunded', value: 'REFUNDED', count: t?.refunded},
                {label: 'Rejected', value: 'REJECTED', count: t?.rejected},
              ]}
              tab={tab}
              onTab={(value) => {
                setTab(value as CreditNoteTab | undefined);
                list.setPage(1);
              }}
              searchText={list.searchText}
              onSearch={list.setSearchText}
              placeholder="Credit note, bill no, customer"
            >
              <select
                value={shopId}
                onChange={(e) => {
                  setShopId(e.target.value);
                  list.setPage(1);
                }}
                aria-label="Shop"
                className="border border-ivory-300 bg-white px-3 py-1.5 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
              >
                <option value="">All shops</option>
                {shops?.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </ListToolbar>
          </div>
          <CreditNoteTable
            notes={data?.items}
            loading={isPending}
            error={
              error
                ? getErrorMessage(error, 'Could not load returns')
                : undefined
            }
            selectedId={selectedId}
            onSelect={(n) => setSelectedId(n.id)}
            showShop
            pagination={data?.pagination}
            onPageChange={list.setPage}
          />
        </section>

        <aside className="xl:sticky xl:top-4">
          {selected ? (
            <CreditNoteDetail note={selected} canDecide />
          ) : (
            <div className="panel p-6 text-body-sm text-on-surface-variant">
              Select a return to see its details.
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
