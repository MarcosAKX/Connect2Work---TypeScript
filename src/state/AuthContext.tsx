import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { services } from '../services';
import type { User } from '../types/domain';

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  login(email: string, password: string): Promise<User>;
  loginWithGoogle(): Promise<User>;
  refreshUser(): void;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(() => services.auth.getCurrentUser());

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAdmin: user?.role === 'admin',
    async login(email, password) {
      const authenticatedUser = await services.auth.login(email, password);
      setUser(authenticatedUser);
      return authenticatedUser;
    },
    async loginWithGoogle() {
      const authenticatedUser = await services.auth.loginWithGoogle();
      setUser(authenticatedUser);
      return authenticatedUser;
    },
    refreshUser() {
      setUser(services.auth.getCurrentUser());
    },
    async logout() {
      await services.auth.logout();
      setUser(null);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return value;
}
