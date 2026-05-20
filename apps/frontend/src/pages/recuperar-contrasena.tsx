import Link from 'next/link';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function RecuperarContrasenaPage() {
  const [correo, setCorreo] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/auth/recuperar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo }),
      });
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="surface-card p-4 border-round shadow-2" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 className="text-xl font-bold mb-1">Recuperar contraseña</h1>
        <p className="text-color-secondary text-sm mb-4">Completo en spec 004.</p>
        {sent ? (
          <Message
            severity="success"
            text="Si el correo está registrado, recibirás las instrucciones."
            className="w-full"
          />
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-column gap-3">
            <InputText
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@correo.com"
              required
            />
            <Button type="submit" label="Enviar instrucciones" loading={loading} />
          </form>
        )}
        <div className="mt-3 text-center">
          <Link href="/login" className="text-primary text-sm">Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
}
