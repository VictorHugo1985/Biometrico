import type { NextPage } from 'next';

const DashboardPage: NextPage & { requiredRoles: string[] } = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Dashboard de Asistencia</h1>
      <p className="text-color-secondary">Módulo en desarrollo — spec 008.</p>
    </div>
  );
};

DashboardPage.requiredRoles = ['administrador', 'supervisor'];
export default DashboardPage;
