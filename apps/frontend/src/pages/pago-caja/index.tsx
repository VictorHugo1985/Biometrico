import type { NextPage } from 'next';

const Page: NextPage & { requiredRoles: string[] } = () => (
  <div>
    <h1 className="text-2xl font-bold mb-2">Pago por Caja</h1>
    <p className="text-color-secondary">Módulo en desarrollo — spec 012.</p>
  </div>
);
Page.requiredRoles = ['administrador', 'caja'];
export default Page;
