import {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {api, setSignedOutHandler, tokens, Tokens} from './api';
import type {Me} from './types';

type AuthState = {
  me: Me | null;
  loading: boolean;
  signedIn: boolean;
  signIn: (identifier: string, password: string) => Promise<Me>;
  signOut: () => void;
  /** Keep the new session tokens issued after a password change */
  adoptTokens: (t: Tokens) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const qc = useQueryClient();
  const [hasToken, setHasToken] = useState(() => !!tokens.read());

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/users/me'),
    enabled: hasToken,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const signOut = useCallback(() => {
    const t = tokens.read();
    if (t) api.post('/users/logout').catch(() => undefined);
    tokens.clear();
    setHasToken(false);
    qc.removeQueries({queryKey: ['me']});
    qc.removeQueries({queryKey: ['store-private']});
  }, [qc]);

  useEffect(() => {
    setSignedOutHandler(() => {
      setHasToken(false);
      qc.removeQueries({queryKey: ['me']});
      qc.removeQueries({queryKey: ['store-private']});
    });
  }, [qc]);

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      const res = await api.post<Tokens & {user: Me}>('/users/login', {username: identifier.trim(), password});
      if (res.user.role !== 'USER') {
        throw new Error('This is a staff account. Please use the Cloth Pro panel to sign in.');
      }
      tokens.write({accessToken: res.accessToken, refreshToken: res.refreshToken});
      setHasToken(true);
      const me = await qc.fetchQuery({queryKey: ['me'], queryFn: () => api.get<Me>('/users/me')});
      qc.invalidateQueries({queryKey: ['store-private']});
      return me;
    },
    [qc],
  );

  const adoptTokens = useCallback((t: Tokens) => tokens.write(t), []);

  const value = useMemo<AuthState>(
    () => ({
      me: hasToken ? (meQuery.data ?? null) : null,
      loading: hasToken && meQuery.isLoading,
      signedIn: hasToken && !!meQuery.data,
      signIn,
      signOut,
      adoptTokens,
    }),
    [hasToken, meQuery.data, meQuery.isLoading, signIn, signOut, adoptTokens],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
};
