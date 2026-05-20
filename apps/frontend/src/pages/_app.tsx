import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { PrimeReactProvider } from 'primereact/api';
import { AuthProvider, useAuthContext } from '@/providers/AuthProvider';
import { AppShell } from '@/components/shell/AppShell';

import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

const PUBLIC_ROUTES = ['/login', '/recuperar-contrasena', '/403', '/404'];

type PageWithRoles = AppProps['Component'] & { requiredRoles?: string[] };

function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { usuario, isLoading, isAuthenticated } = useAuthContext();
  const isPublic = PUBLIC_ROUTES.some((r) => router.pathname.startsWith(r));

  useEffect(() => {
    if (isLoading) return;
    if (!isPublic && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(router.pathname)}`);
      return;
    }
    const requiredRoles = (Component as PageWithRoles).requiredRoles;
    if (!isPublic && isAuthenticated && requiredRoles && usuario && !requiredRoles.includes(usuario.rol)) {
      router.replace('/403');
    }
  }, [isLoading, isAuthenticated, isPublic, usuario, router, Component]);

  if (!isPublic && isLoading) return null;

  if (isPublic) return <Component {...pageProps} />;

  return (
    <AppShell>
      <Component {...pageProps} />
    </AppShell>
  );
}

export default function App(props: AppProps) {
  return (
    <PrimeReactProvider>
      <AuthProvider>
        <AppContent {...props} />
      </AuthProvider>
    </PrimeReactProvider>
  );
}
