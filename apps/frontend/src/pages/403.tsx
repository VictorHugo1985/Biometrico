import Link from 'next/link';

export default function AccessDeniedPage() {
  return (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="text-center">
        <i className="pi pi-lock text-6xl text-red-400 mb-4" style={{ display: 'block' }} />
        <h1 className="text-3xl font-bold mb-2">Acceso denegado</h1>
        <p className="text-color-secondary mb-4">No tienes permiso para acceder a esta sección.</p>
        <Link href="/dashboard" className="p-button p-button-primary no-underline">
          Ir al Dashboard
        </Link>
      </div>
    </div>
  );
}
