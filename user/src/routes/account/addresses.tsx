import {useState} from 'react';
import {createFileRoute} from '@tanstack/react-router';
import {Briefcase, Home, MapPin, Pencil, Plus, Trash2} from 'lucide-react';
import toast from 'react-hot-toast';
import {errorMessage} from '@/lib/api';
import {useAuth} from '@/lib/auth';
import {useAddresses, useDeleteAddress, useSaveAddress} from '@/lib/queries';
import type {Address} from '@/lib/types';
import AddressForm from '@/components/AddressForm';
import {btn, ErrorBox, Spinner} from '@/components/ui';
import {card, Dialog, PageHead} from '@/components/account';

export const Route = createFileRoute('/account/addresses')({component: AddressesPage});

const LABEL = {
  HOME: {text: 'Home', icon: Home},
  WORK: {text: 'Work', icon: Briefcase},
  OTHER: {text: 'Other', icon: MapPin},
} as const;

function AddressesPage() {
  const {me} = useAuth();
  const {data, isLoading, error, refetch} = useAddresses();
  const remove = useDeleteAddress();
  const save = useSaveAddress();
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const [removing, setRemoving] = useState<Address | null>(null);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox message="Could not load your addresses." retry={refetch} />;
  const list = data ?? [];

  const makeDefault = (a: Address) =>
    save.mutate(
      {id: a.id, recipient: a.recipient, phone: a.phone, postalCode: a.postalCode, address1: a.address1, address2: a.address2 ?? undefined, city: a.city, district: a.district ?? undefined, state: a.state, label: a.label, isDefault: true},
      {onError: (e) => toast.error(errorMessage(e))},
    );

  return (
    <div>
      <PageHead
        title="Addresses"
        sub={list.length ? `${list.length} saved · the default one is picked at checkout` : 'Save where you want things delivered'}
        action={
          <button onClick={() => setEditing('new')} className={btn.primary}>
            <Plus size={14} /> Add address
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((a) => {
          const L = LABEL[a.label] ?? LABEL.OTHER;
          return (
            <article key={a.id} className={`${card} flex flex-col ${a.isDefault ? 'border-brand ring-1 ring-brand/20' : ''}`}>
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <L.icon size={14} />
                  </span>
                  {L.text}
                </span>
                {a.isDefault && <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Default</span>}
              </div>
              <div className="flex-1 px-4 py-3 text-sm">
                <p className="font-semibold">{a.recipient}</p>
                <p className="mt-0.5 text-ink-soft">
                  {a.address1}
                  {a.address2 ? `, ${a.address2}` : ''}
                  <br />
                  {a.city}
                  {a.district && a.district !== a.city ? `, ${a.district}` : ''}, {a.state} – {a.postalCode}
                </p>
                <p className="mt-1.5 text-ink-soft">Phone: +91 {a.phone}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-line px-4 py-2.5">
                <button onClick={() => setEditing(a)} className={btn.ghost}>
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={() => setRemoving(a)} className="tap inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft hover:text-red-700">
                  <Trash2 size={13} /> Remove
                </button>
                {!a.isDefault && (
                  <button onClick={() => makeDefault(a)} disabled={save.isPending} className="tap ml-auto text-xs font-semibold text-brand hover:underline">
                    Set as default
                  </button>
                )}
              </div>
            </article>
          );
        })}
        <button
          onClick={() => setEditing('new')}
          className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line bg-white/50 text-ink-soft transition hover:border-brand hover:text-brand"
        >
          <Plus size={24} />
          <span className="text-sm font-semibold">Add a new address</span>
        </button>
      </div>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add a new address' : 'Edit address'} wide>
        {editing && (
          <AddressForm
            initial={editing === 'new' ? undefined : editing}
            defaults={{recipient: me?.fullname ?? '', phone: me?.phoneNumber ?? '', isDefault: !list.length}}
            onSaved={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Dialog>

      <Dialog open={!!removing} onClose={() => setRemoving(null)} title="Remove this address?">
        {removing && (
          <>
            <p className="text-sm text-ink-soft">
              {removing.recipient}, {removing.address1}, {removing.city}
              {removing.isDefault && list.length > 1 && <span className="mt-2 block">Another saved address will become your default.</span>}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setRemoving(null)} className={btn.outline}>
                Keep it
              </button>
              <button onClick={() => remove.mutate(removing.id, {onSuccess: () => setRemoving(null)})} className={`${btn.primary} bg-red-700 hover:bg-red-800`} disabled={remove.isPending}>
                Remove
              </button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
