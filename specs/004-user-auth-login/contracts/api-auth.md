# Contrato API: Autenticación

## POST /api/auth/login
```json
// Request
{ "correo": "admin@empresa.com", "contrasena": "pass123", "recordar": true }

// Response 200
{ "data": { "token": "jwt...", "usuario": { "id": "uuid", "correo": "...", "rol": "administrador" } }, "message": "Login exitoso" }

// Response 401
{ "code": "INVALID_CREDENTIALS", "message": "Credenciales incorrectas" }

// Response 403
{ "code": "ACCOUNT_INACTIVE", "message": "La cuenta está inactiva" }
```

## POST /api/auth/logout
```json
// Headers: Authorization: Bearer <token>
// Response 200
{ "data": null, "message": "Sesión cerrada" }
```

## POST /api/auth/recuperar
```json
// Request
{ "correo": "user@empresa.com" }

// Response 200 (mismo mensaje para correo existente y no existente)
{ "data": null, "message": "Si el correo está registrado, recibirás las instrucciones" }
```

## POST /api/auth/recuperar/confirmar
```json
// Request
{ "token": "raw-token-from-email", "nueva_contrasena": "nuevaPass456" }

// Response 200
{ "data": null, "message": "Contraseña actualizada. Por favor inicia sesión nuevamente." }

// Response 400 (token inválido/expirado)
{ "code": "INVALID_TOKEN", "message": "El enlace no es válido o ha expirado" }
```

## Middleware de autenticación

Todos los endpoints protegidos requieren:
```
Authorization: Bearer <jwt>
```

El JWT debe ser válido, no expirado, y el `sid` debe existir en `sesiones_usuario` con `estado = 'activo'`.
