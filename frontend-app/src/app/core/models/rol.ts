import { Permiso } from './permiso';

export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string | null;
  permisos?: { permiso: Permiso }[];
}

