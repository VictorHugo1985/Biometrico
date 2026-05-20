import React, { createContext, useContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import type { RolUsuario } from '@/config/navigation';

export interface UsuarioActual {
  id: string;
  correo: string;
  nombre: string;
  rol: RolUsuario;
}

interface AuthContextValue {
  usuario: UsuarioActual | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const COOKIE_NAME = 'biometrico_token';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function decodeJwtPayload(token: string): UsuarioActual | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.sub || !payload.correo || !payload.rol) return null;
    return {
      id: payload.sub,
      correo: payload.correo,
      nombre: payload.nombre ?? payload.correo,
      rol: payload.rol as RolUsuario,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioActual | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get(COOKIE_NAME) ?? (typeof localStorage !== 'undefined' ? localStorage.getItem(COOKIE_NAME) ?? '' : '');
    if (token) {
      const decoded = decodeJwtPayload(token);
      setUsuario(decoded);
    }
    setIsLoading(false);
  }, []);

  async function logout() {
    const token = Cookies.get(COOKIE_NAME);
    if (token) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore network errors on logout
      }
    }
    Cookies.remove(COOKIE_NAME);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(COOKIE_NAME);
    setUsuario(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ usuario, isLoading, isAuthenticated: !!usuario, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
