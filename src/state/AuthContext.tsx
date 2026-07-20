import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { services } from '../services';
import type { User } from '../types/domain';

interface AuthContextValue {
  user: User | null;
  login(email: string, password: string): Promise<void>;
  loginWithGoogle(): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(() => services.auth.getCurrentUser());

  const value = useMemo<AuthContextValue>(() => ({
    user,
    async login(email, password) {
      setUser(await services.auth.login(email, password));
    },
    async loginWithGoogle() {
      setUser(await services.auth.loginWithGoogle());
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
