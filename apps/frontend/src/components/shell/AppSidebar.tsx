import Link from 'next/link';
import { useRouter } from 'next/router';
import { useNavItems } from '@/hooks/useNavItems';

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const items = useNavItems();
  const router = useRouter();

  return (
    <nav
      className="flex flex-column gap-1 py-3 px-2"
      style={{ width: '250px', minHeight: '100%' }}
    >
      {items.map((item) => {
        const isActive = router.pathname.startsWith(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            className={[
              'flex align-items-center gap-3 px-3 py-2 border-round no-underline text-color',
              'transition-colors transition-duration-150',
              isActive
                ? 'bg-primary text-white font-semibold'
                : 'hover:surface-200',
            ].join(' ')}
          >
            <i className={item.icon} />
            <span className="text-sm">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
