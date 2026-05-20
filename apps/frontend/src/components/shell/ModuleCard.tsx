import Link from 'next/link';
import { Card } from 'primereact/card';
import type { NavItem } from '@/config/navigation';

interface ModuleCardProps {
  item: NavItem;
  description: string;
}

export function ModuleCard({ item, description }: ModuleCardProps) {
  return (
    <Link href={item.href} className="no-underline col-12 sm:col-6 md:col-4 lg:col-3 p-2" style={{ display: 'block' }}>
      <Card className="h-full cursor-pointer hover:shadow-4 transition-shadow transition-duration-200">
        <div className="flex flex-column align-items-center gap-3 text-center py-2">
          <i className={`${item.icon} text-4xl text-primary`} />
          <span className="font-semibold text-color">{item.label}</span>
          <span className="text-sm text-color-secondary">{description}</span>
        </div>
      </Card>
    </Link>
  );
}
