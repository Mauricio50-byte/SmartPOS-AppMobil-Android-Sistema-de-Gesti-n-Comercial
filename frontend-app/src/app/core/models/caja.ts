export interface MovimientoCaja {
    id: number;
    cajaId: number;
    usuarioId: number;
    tipo: 'INGRESO' | 'EGRESO' | 'VENTA' | 'PAGO_GASTO' | 'ABONO_VENTA';
    metodoPago: string;
    monto: number;
    descripcion?: string;
    fecha: string | Date;
    ventaId?: number;
    gastoId?: number;
    abonoId?: number;
}

export interface Caja {
    id: number;
    usuarioId: number;
    fechaApertura: string | Date;
    fechaCierre?: string | Date;
    montoInicial: number;
    montoFinal?: number;
    montoSistema?: number;
    diferencia?: number;
    estado: 'ABIERTA' | 'CERRADA';
    observaciones?: string;
    movimientos?: MovimientoCaja[];
    resumen?: {
        totalIngresos: number;
        totalEgresos: number;
        saldoActual: number;
        saldoEfectivo?: number;
    };
    usuario?: {
        nombre: string;
    };
}
