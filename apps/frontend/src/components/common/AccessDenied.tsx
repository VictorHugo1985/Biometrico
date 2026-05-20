import Link from 'next/link';

export function AccessDenied() {
  return (
    <div className="flex flex-column align-items-center justify-content-center gap-3 py-6">
      <i className="pi pi-lock text-5xl text-red-400" />
      <h2 className="text-xl font-bold">Acceso denegado</h2>
      <p className="text-color-secondary text-center" style={{ maxWidth: '320px' }}>
        No tienes permiso para acceder a esta sección.
      </p>
      <Link href="/dashboard" className="p-button p-button-primary no-underline">
        Volver al Dashboard
      </Link>
    </div>
  );
}
