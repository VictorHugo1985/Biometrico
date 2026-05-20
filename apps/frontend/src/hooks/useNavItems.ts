import { NAV_ITEMS, type NavItem } from '@/config/navigation';
import { useAuth } from '@/hooks/useAuth';

export function useNavItems(): NavItem[] {
  const { usuario, isLoading } = useAuth();
  if (isLoading || !usuario) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(usuario.rol));
}
