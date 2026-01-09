import { DetalleVenta } from './detalle-venta';
import { Cliente } from './cliente';
import { Usuario } from './usuario';

export interface Venta {
  id: number;
  fecha: string;
  total: number;
  clienteId?: number | null;
  usuarioId: number;
  metodoPago?: string;
  estadoPago?: string;
  montoPagado?: number;
  saldoPendiente?: number;
  detalles: DetalleVenta[];
  cliente?: Cliente | null;
  usuario?: Usuario;
}

