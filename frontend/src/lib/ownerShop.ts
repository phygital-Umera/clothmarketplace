import {AUTH_KEYS} from '@/lib/react-query/queryKeys';
import {useQueryClient} from '@tanstack/react-query';
import {useCallback, useMemo, useSyncExternalStore} from 'react';

/** The shop a company admin is working in ("shop mode") */
export type OwnerShop = {userId: string; id: string; name: string};

// Per browser tab: two tabs can work in two different shops
const KEY = 'ownerShop';
const listeners = new Set<() => void>();

const readStored = (): string | null => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

// Kept in memory too, so shop mode still works when storage is blocked
let current = readStored();
// The last shop the server refused (closed, or moved to another company)
let refusedId: string | null = null;

const decode = (raw: string | null): OwnerShop | null => {
  try {
    const shop = raw ? (JSON.parse(raw) as OwnerShop) : null;
    return shop?.id ? shop : null;
  } catch {
    return null;
  }
};

const parse = (raw: string | null, userId?: string): OwnerShop | null => {
  const shop = decode(raw);
  return shop && userId && shop.userId === userId ? shop : null;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The open shop, only if it was opened by this user */
export const getOwnerShop = (userId?: string): OwnerShop | null =>
  parse(current, userId);

export const setOwnerShop = (shop: OwnerShop | null) => {
  const next = shop ? JSON.stringify(shop) : null;
  if (shop) refusedId = null;
  if (next === current) return;
  current = next;
  try {
    if (next) sessionStorage.setItem(KEY, next);
    else sessionStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the shop stays open for this page only
  }
  listeners.forEach((listener) => listener());
};

/**
 * The server refused this shop: close it, unless the user already moved on to
 * another shop. The picker will not open it again by itself.
 */
export const refuseOwnerShop = (shopId: string) => {
  if (decode(current)?.id !== shopId) return;
  refusedId = shopId;
  setOwnerShop(null);
};

/** Id of the shop the server last refused, if any */
export const refusedShopId = () => refusedId;

export const useOwnerShop = (userId?: string): OwnerShop | null => {
  const raw = useSyncExternalStore(subscribe, () => current);
  return useMemo(() => parse(raw, userId), [raw, userId]);
};

/** Open a shop; the old shop's data is dropped first (query keys do not include the shop) */
export const useSwitchShop = () => {
  const queryClient = useQueryClient();
  return useCallback(
    (shop: OwnerShop) => {
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== AUTH_KEYS.GET_CURRENT_USER,
      });
      setOwnerShop(shop);
    },
    [queryClient],
  );
};
