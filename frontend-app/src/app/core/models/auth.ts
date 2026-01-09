import { UsuarioPerfil } from './usuario';

export interface AuthResponse {
  token: string;
  usuario: UsuarioPerfil;
}

