import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="text-center">
        <i className="pi pi-exclamation-circle text-6xl text-yellow-400 mb-4" style={{ display: 'block' }} />
        <h1 className="text-3xl font-bold mb-2">Página no encontrada</h1>
        <p className="text-color-secondary mb-4">La ruta que buscas no existe.</p>
        <Link href="/dashboard" className="p-button p-button-primary no-underline">
          Ir al Dashboard
        </Link>
      </div>
    </div>
  );
}
