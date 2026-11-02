import {ReactNode, useCallback, useState} from 'react';
import {AuthContext} from './AuthContext';
import {Token, User} from '@/types';
import {QUERY_KEYS} from '@/lib/react-query/queryKeys';
import {jwtDecode} from 'jwt-decode';

type Session = {token: Token; user: User} | null;

// Read synchronously so route guards see the session on the very first render
const readSession = (): Session => {
  try {
    const token: Token | null = JSON.parse(
      localStorage.getItem(QUERY_KEYS.TOKEN) || 'null',
    );
    if (!token?.accessToken) return null;

    const user: User = jwtDecode(token.accessToken);
    // An expired access token is fine while a refresh token exists: the
    // axios interceptor refreshes it on the next request
    if (user.exp * 1000 < Date.now() && !token.refreshToken) {
      localStorage.removeItem(QUERY_KEYS.TOKEN);
      return null;
    }
    return {token, user};
  } catch {
    localStorage.removeItem(QUERY_KEYS.TOKEN);
    return null;
  }
};

const AuthContextProvider = ({children}: {children: ReactNode}) => {
  const [initial] = useState(readSession);
  const [user, setUser] = useState<User | null>(initial?.user ?? null);
  const [role, setRole] = useState<string | null>(initial?.user.role ?? null);
  const [token, setToken] = useState<Token | null>(initial?.token ?? null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!initial);

  const login = useCallback((newToken: Required<Token>) => {
    localStorage.setItem(QUERY_KEYS.TOKEN, JSON.stringify(newToken));
    const decoded: User = jwtDecode(newToken.accessToken);
    setToken(newToken);
    setUser(decoded);
    setRole(decoded.role);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(QUERY_KEYS.TOKEN);
    setToken(null);
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);
  }, []);

  // Value of the context
  const contextValue = {
    user,
    setUser,
    role,
    setRole,
    token,
    setToken,
    isAuthenticated,
    setIsAuthenticated,
    isSuperAdmin: role === 'SUPER_ADMIN',
    isCompanyAdmin: role === 'ADMIN',
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export default AuthContextProvider;
