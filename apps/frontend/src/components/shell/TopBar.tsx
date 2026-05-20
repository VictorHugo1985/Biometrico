import { Button } from 'primereact/button';
import { useAuth } from '@/hooks/useAuth';

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const { usuario, logout } = useAuth();

  return (
    <div
      className="flex align-items-center justify-content-between px-3 py-2 surface-100 border-bottom-1 surface-border"
      style={{ minHeight: '56px' }}
    >
      <div className="flex align-items-center gap-2">
        <Button
          icon="pi pi-bars"
          className="p-button-text p-button-plain lg:hidden"
          onClick={onMenuToggle}
          aria-label="Abrir menú"
        />
        <span className="font-bold text-xl text-primary">Biométrico</span>
      </div>
      <div className="flex align-items-center gap-3">
        {usuario && (
          <span className="text-sm text-color-secondary hidden sm:inline">
            {usuario.nombre} · <span className="capitalize">{usuario.rol}</span>
          </span>
        )}
        <Button
          label="Salir"
          icon="pi pi-sign-out"
          className="p-button-text p-button-sm"
          onClick={logout}
        />
      </div>
    </div>
  );
}
