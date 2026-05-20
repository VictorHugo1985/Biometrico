import type { NextPage } from 'next';

const Page: NextPage & { requiredRoles: string[] } = () => (
  <div>
    <h1 className="text-2xl font-bold mb-2">Configuración del Sistema</h1>
    <p className="text-color-secondary">Módulo en desarrollo — spec 013.</p>
  </div>
);
Page.requiredRoles = ['administrador'];
export default Page;
