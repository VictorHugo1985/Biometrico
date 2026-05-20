import type { NextPage } from 'next';

const Page: NextPage & { requiredRoles: string[] } = () => (
  <div>
    <h1 className="text-2xl font-bold mb-2">Reportes</h1>
    <p className="text-color-secondary">Módulo en desarrollo — spec 016.</p>
  </div>
);
Page.requiredRoles = ['administrador', 'supervisor'];
export default Page;
