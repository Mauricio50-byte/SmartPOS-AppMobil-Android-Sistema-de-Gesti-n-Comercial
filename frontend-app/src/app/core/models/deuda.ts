import { Cliente } from './cliente';
import { Venta } from './venta';

export interface Deuda {
    id: number;
    clienteId: number;
    ventaId: number;
    montoTotal: number;
    saldoPendiente: number;
    estado: 'PENDIENTE' | 'PAGADO' | 'VENCIDO';
    fechaCreacion: string;
    fechaVencimiento?: string | null;
    cliente?: Cliente;
    venta?: Venta;
    abonos?: Abono[];
}

export interface Abono {
    id: number;
    deudaId: number;
    clienteId: number;
    monto: number;
    metodoPago: string;
    fecha: string;
    usuarioId?: number | null;
    nota?: string | null;
    cliente?: Cliente;
}
