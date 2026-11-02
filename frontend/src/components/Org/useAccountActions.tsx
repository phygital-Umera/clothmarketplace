import {ConfirmDialog, RowAction} from '@/components/Forms';
import {
  useRevokeSessions,
  useSetUserStatus,
} from '@/lib/react-query/queriesAndMutations/org';
import {AccountStatus, Panel} from '@/types/org';
import {Ban, CircleCheck, CirclePause, LogOut} from 'lucide-react';
import {useState} from 'react';

type Target = {id: string; fullname: string; status: AccountStatus};
type Pending = {
  target: Target;
  action: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'REVOKE';
};

const COPY = {
  ACTIVE: {title: 'Activate account?', label: 'Activate', tone: 'default'},
  INACTIVE: {title: 'Deactivate account?', label: 'Deactivate', tone: 'danger'},
  BLOCKED: {title: 'Block account?', label: 'Block', tone: 'danger'},
  REVOKE: {title: 'End all sessions?', label: 'End sessions', tone: 'danger'},
} as const;

/**
 * Activate / Deactivate / Block / Revoke sessions for a user, as table row
 * actions plus the confirmation dialog (deactivate and block need a reason).
 * The backend checks the user is in the admin's scope.
 */
const useAccountActions = (panel: Panel) => {
  const [pending, setPending] = useState<Pending | null>(null);
  const setStatus = useSetUserStatus(panel);
  const revoke = useRevokeSessions(panel);

  const actionsFor = <T extends Target>(user: T): RowAction<T>[] => {
    const open = (action: Pending['action']) => () =>
      setPending({target: user, action});
    return [
      user.status !== 'ACTIVE'
        ? {
            label: 'Activate',
            icon: <CircleCheck size={16} />,
            onClick: open('ACTIVE'),
          }
        : {
            label: 'Deactivate',
            icon: <CirclePause size={16} />,
            onClick: open('INACTIVE'),
          },
      ...(user.status !== 'BLOCKED'
        ? [
            {
              label: 'Block',
              icon: <Ban size={16} />,
              onClick: open('BLOCKED'),
              tone: 'danger' as const,
            },
          ]
        : []),
      {
        label: 'End sessions',
        icon: <LogOut size={16} />,
        onClick: open('REVOKE'),
      },
    ];
  };

  const copy = pending ? COPY[pending.action] : COPY.ACTIVE;
  const name = pending?.target.fullname ?? 'This user';

  const dialog = (
    <ConfirmDialog
      open={!!pending}
      title={copy.title}
      message={
        pending?.action === 'REVOKE'
          ? `${name} will be signed out on every device.`
          : pending?.action === 'ACTIVE'
            ? `${name} will be able to sign in again.`
            : `${name} will be signed out and cannot sign in.`
      }
      confirmLabel={copy.label}
      tone={copy.tone}
      requireReason={
        pending?.action === 'INACTIVE' || pending?.action === 'BLOCKED'
      }
      isLoading={setStatus.isPending || revoke.isPending}
      onCancel={() => setPending(null)}
      onConfirm={async (reason) => {
        if (!pending) return;
        const {target, action} = pending;
        await (
          action === 'REVOKE'
            ? revoke.mutateAsync(target.id)
            : setStatus.mutateAsync({id: target.id, status: action, reason})
        ).catch(() => undefined);
        setPending(null);
      }}
    />
  );

  return {actionsFor, dialog};
};

export default useAccountActions;
