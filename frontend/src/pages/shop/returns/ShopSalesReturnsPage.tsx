import CreditNoteDetail from '@/components/CreditNotes/CreditNoteDetail';
import CreditNoteTable from '@/components/CreditNotes/CreditNoteTable';
import NewReturnModal from '@/components/CreditNotes/NewReturnModal';
import ListToolbar from '@/components/Org/ListToolbar';
import {PageHeader} from '@/components/ui';
import {useAuthContext} from '@/context/AuthContext';
import useListState from '@/hooks/useListState';
import {
  useCreditNote,
  useCreditNotes,
} from '@/lib/react-query/queriesAndMutations/creditNote';
import {CreditNoteTab} from '@/types/creditNote';
import {getErrorMessage} from '@/utils/axios';
import {Plus} from 'lucide-react';
import {useState} from 'react';

const TABS: {label: string; value: CreditNoteTab | undefined}[] = [
  {label: 'All', value: undefined},
  {label: 'Waiting approval', value: 'NEEDS_APPROVAL'},
  {label: 'Exchange', value: 'EXCHANGE'},
  {label: 'Store credit', value: 'STORE_CREDIT'},
  {label: 'Refunded', value: 'REFUNDED'},
  {label: 'Rejected', value: 'REJECTED'},
];

/**
 * Shop admin: returns taken at this shop's counter. The company owner running
 * the shop can also decide returns waiting for approval.
 */
export default function ShopSalesReturnsPage() {
  const {role} = useAuthContext();
  const isOwner = role === 'ADMIN';
  const list = useListState();
  const [tab, setTab] = useState<CreditNoteTab | undefined>();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {data, isPending, error} = useCreditNotes('shop-admin', {
    ...list.params,
    tab,
  });
  const {data: selected} = useCreditNote('shop-admin', selectedId ?? undefined);

  return (
    <>
      <PageHeader
        breadcrumbs={[{label: 'Sales'}, {label: 'Sales returns'}]}
        title="Sales returns"
        subtitle={
          isOwner
            ? 'Take back items from a sales bill as an exchange, store credit or refund. Your refunds are approved at once; decide returns waiting for approval here.'
            : 'Take back items from a sales bill as an exchange, store credit or refund. Cash refunds and large refunds need approval.'
        }
        actions={
          <button
            type="button"
            className="btn-primary"
            onClick={() => setCreating(true)}
          >
            <Plus size={16} /> New return
          </button>
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="panel">
          <div className="p-3">
            <ListToolbar
              tabs={TABS}
              tab={tab}
              onTab={(value) => {
                setTab(value as CreditNoteTab | undefined);
                list.setPage(1);
              }}
              searchText={list.searchText}
              onSearch={list.setSearchText}
              placeholder="Credit note, bill no, customer"
            />
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
            pagination={data?.pagination}
            onPageChange={list.setPage}
          />
        </section>

        <aside className="xl:sticky xl:top-4">
          {selected ? (
            <CreditNoteDetail
              note={selected}
              canDecide={isOwner}
              panel="shop-admin"
            />
          ) : (
            <div className="panel p-6 text-body-sm text-on-surface-variant">
              Select a return to see its details.
            </div>
          )}
        </aside>
      </div>

      <NewReturnModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
