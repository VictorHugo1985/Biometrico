export interface JWTPayload {
  sub: string;
  correo: string;
  rol: string;
  sid: string;
  exp: number;
  iat: number;
}

export interface LoginRequest {
  correo: string;
  contrasena: string;
  recordar?: boolean;
}

export interface LoginResponse {
  token: string;
  usuario: {
    id: string;
    correo: string;
    rol: string;
    contrasena_temporal: boolean;
  };
}

export interface UsuarioRow {
  id: string;
  correo: string;
  hash_contrasena: string;
  rol: string;
  activo: boolean;
  contrasena_temporal: boolean;
}
