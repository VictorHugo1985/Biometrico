import { useState } from 'react';
import { useRouter } from 'next/router';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const COOKIE_NAME = 'biometrico_token';

export default function LoginPage() {
  const router = useRouter();
  const redirect = (router.query.redirect as string) ?? '/dashboard';

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ correo, contrasena }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? 'Credenciales incorrectas');
        return;
      }
      const token: string = body.data?.token;
      Cookies.set(COOKIE_NAME, token, { expires: 1 });
      router.replace(redirect);
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="surface-card p-4 border-round shadow-2" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 className="text-2xl font-bold text-center mb-4 text-primary">Biométrico</h1>
        <form onSubmit={handleSubmit} className="flex flex-column gap-3">
          <div className="flex flex-column gap-1">
            <label htmlFor="correo" className="text-sm font-medium">Correo</label>
            <InputText
              id="correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="admin@empresa.com"
              required
              autoFocus
            />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="contrasena" className="text-sm font-medium">Contraseña</label>
            <Password
              inputId="contrasena"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              feedback={false}
              toggleMask
              className="w-full"
              inputClassName="w-full"
              required
            />
          </div>
          {error && <Message severity="error" text={error} />}
          <Button
            type="submit"
            label="Iniciar sesión"
            loading={loading}
            className="w-full"
          />
        </form>
      </div>
    </div>
  );
}
