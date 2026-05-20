import type { NextPage } from 'next';
import { useAuth } from '@/hooks/useAuth';
import { useNavItems } from '@/hooks/useNavItems';
import { MODULE_DESCRIPTIONS } from '@/config/navigation';
import { ModuleCard } from '@/components/shell/ModuleCard';

const HomePage: NextPage = () => {
  const { usuario } = useAuth();
  const items = useNavItems();

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1">Inicio</h1>
        {usuario && (
          <p className="text-color-secondary">
            Bienvenido, <strong>{usuario.nombre}</strong>. Selecciona un módulo para comenzar.
          </p>
        )}
      </div>
      <div className="grid">
        {items.map((item) => (
          <ModuleCard
            key={item.key}
            item={item}
            description={MODULE_DESCRIPTIONS[item.key] ?? ''}
          />
        ))}
      </div>
    </div>
  );
};

export default HomePage;
