# Research: Autenticación de Usuarios

## 1. Estrategia de token

**Decision**: JWT firmado con HS256, almacenado en `sesiones_usuario`

**Rationale**: JWT auto-contenido (incluye `user_id`, `rol`, `session_id`) permite validar sin
consultar DB en cada request. Se guarda el hash del token en `sesiones_usuario` para poder
invalidarlo (logout, cambio de contraseña). El `session_id` en el JWT permite lookup O(1).

**Payload del JWT**:
```json
{
  "sub": "uuid-usuario",
  "rol": "supervisor",
  "sid": "uuid-sesion",
  "exp": 1748000000
}
```

**Alternatives considered**:
- Solo session en DB (sin JWT): require lookup en cada request → latencia mayor
- Refresh token + access token corto: más seguro pero más complejo; no justificado para v1

## 2. Almacenamiento del token en el cliente

**Decision**: Cookie HttpOnly + Secure en producción; localStorage en desarrollo

**Rationale**: Cookie HttpOnly protege contra XSS. En desarrollo Next.js con hot-reload, cookie
puede tener problemas cross-port; localStorage es aceptable para desarrollo local.

## 3. "Recordar contraseña"

**Decision**: `max-age` de cookie = 30 días cuando checkbox activo; session cookie (no persiste) cuando inactivo

**Rationale**: Cuando el usuario selecciona "recordar", el JWT se emite con `exp` de 30 días y
la cookie con `max-age` equivalente. Al cerrar el navegador, la cookie persiste. Sin "recordar",
es una session cookie que desaparece al cerrar el navegador.

## 4. Recuperación de contraseña — envío de email

**Decision**: `nodemailer` con SMTP configurado via variables de entorno

**Variables**:
```
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
```

El token de recuperación se guarda hasheado en `tokens_recuperacion` (no el valor raw, por
seguridad). Se envía el valor raw en el link; al recibir se hashea y compara.

## 5. Política de contraseña

**Decision**: Mínimo 8 caracteres, al menos 1 letra y 1 número

**Implementación**: Regex `/^(?=.*[A-Za-z])(?=.*\d).{8,}$/`
Validación en backend y frontend (principio de Simplicidad IX — error accionable).

## 6. Hash de contraseña

**Decision**: `bcrypt` con cost factor 12

**Rationale**: Cost 12 es el estándar actual para bcrypt; ~250ms por hash en hardware moderno.
Suficiente para resistir ataques de fuerza bruta sin impactar UX significativamente.
