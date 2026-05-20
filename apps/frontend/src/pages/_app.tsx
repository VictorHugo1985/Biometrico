import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { AuthProvider, useAuthContext } from '@/providers/AuthProvider';
import { AppShell } from '@/components/shell/AppShell';

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
    <AuthProvider>
      <AppContent {...props} />
    </AuthProvider>
  );
}
