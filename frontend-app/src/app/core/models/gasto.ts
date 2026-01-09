export interface Gasto {
    id: number;
    proveedor: string;
    concepto: string;
    montoTotal: number;
    saldoPendiente: number;
    fechaVencimiento?: Date;
    estado: 'PENDIENTE' | 'PAGADO' | 'VENCIDO';
    fechaRegistro: Date;
    categoria?: string;
    pagos?: PagoGasto[];
}
  
export interface PagoGasto {
    id: number;
    gastoId: number;
    monto: number;
    fecha: Date;
    metodoPago: string;
    usuarioId?: number;
    nota?: string;
}
