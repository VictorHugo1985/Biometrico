import type { NextPage } from 'next';

const Page: NextPage & { requiredRoles: string[] } = () => (
  <div>
    <h1 className="text-2xl font-bold mb-2">Liquidación Semanal</h1>
    <p className="text-color-secondary">Módulo en desarrollo — spec 007.</p>
  </div>
);
Page.requiredRoles = ['administrador'];
export default Page;
