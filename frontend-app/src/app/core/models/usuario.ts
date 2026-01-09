export interface UsuarioPerfil {
  id: number;
  nombre: string;
  correo: string;
  roles: string[];
  permisos: string[];
  negocioId?: number | null;
  modulos?: string[];
  adminPorDefecto?: boolean;
}

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  activo: boolean;
  creadoEn?: string;
  negocioId?: number | null;
  roles?: string[];
  permisos?: string[]; // Permisos efectivos (Rol + Directos)
  permisosDirectos?: string[]; // Solo permisos asignados directamente
  modulos?: string[];
}
