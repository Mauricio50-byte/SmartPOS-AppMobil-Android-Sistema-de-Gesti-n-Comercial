export interface Cliente {
  id: number;
  nombre: string;
  correo?: string | null;
  telefono?: string | null;
  cedula?: string | null;
  direccion?: string | null;
  activo?: boolean;
  creditoMaximo?: number;
  saldoDeuda?: number;
  puntos?: number;
  creadoEn?: string;
  actualizadoEn?: string;
}

