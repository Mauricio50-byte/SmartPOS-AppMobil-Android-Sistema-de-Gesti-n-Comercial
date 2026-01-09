const { prisma } = require('../../infraestructura/bd')

/**
 * Listar todos los gastos con filtros opcionales
 */
async function listarGastos(filtro = {}) {
    return prisma.gasto.findMany({
        where: filtro,
        include: {
            pagos: {
                orderBy: { fecha: 'desc' },
                include: { usuario: true }
            }
        },
        orderBy: { fechaRegistro: 'desc' }
    })
}

/**
 * Obtener un gasto específico por ID
 */
async function obtenerGastoPorId(id) {
    return prisma.gasto.findUnique({
        where: { id: parseInt(id) },
        include: {
            pagos: {
                orderBy: { fecha: 'desc' },
                include: { usuario: true }
            }
        }
    })
}

/**
 * Crear un nuevo gasto (Cuenta por Pagar)
 */
async function crearGasto(datos) {
    const { proveedor, concepto, montoTotal, fechaVencimiento, categoria } = datos

    return prisma.gasto.create({
        data: {
            proveedor,
            concepto,
            montoTotal,
            saldoPendiente: montoTotal,
            fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
            categoria,
            estado: 'PENDIENTE'
        }
    })
}

/**
 * Registrar un pago a un gasto
 */
async function registrarPagoGasto(datos) {
    const { gastoId, monto, metodoPago = 'EFECTIVO', usuarioId, nota } = datos

    return prisma.$transaction(async (tx) => {
        // Obtener el gasto
        const gasto = await tx.gasto.findUnique({ where: { id: parseInt(gastoId) } })
        if (!gasto) throw new Error('Gasto no encontrado')
        if (gasto.estado === 'PAGADO') throw new Error('Este gasto ya está pagado')

        // Validar que el monto no sea mayor al saldo pendiente
        if (monto > gasto.saldoPendiente) {
            throw new Error(`El monto del pago ($${monto}) no puede ser mayor al saldo pendiente ($${gasto.saldoPendiente})`)
        }

        // Crear el pago
        const pago = await tx.pagoGasto.create({
            data: {
                gastoId: parseInt(gastoId),
                monto,
                metodoPago,
                usuarioId,
                nota
            }
        })

        // Calcular nuevo saldo
        const nuevoSaldo = gasto.saldoPendiente - monto
        const nuevoEstado = nuevoSaldo <= 0 ? 'PAGADO' : gasto.estado

        // --- INTEGRACIÓN CAJA ---
        if (usuarioId) {
             const cajaAbierta = await tx.caja.findFirst({
                 where: { usuarioId: Number(usuarioId), estado: 'ABIERTA' }
             })
             if (cajaAbierta) {
                 const metodoPagoNorm = String(metodoPago).toUpperCase();
                 await tx.movimientoCaja.create({
                     data: {
                         cajaId: cajaAbierta.id,
                         usuarioId: Number(usuarioId),
                         tipo: 'PAGO_GASTO',
                         metodoPago: metodoPagoNorm,
                         monto: monto,
                         descripcion: `Pago a gasto: ${gasto.concepto} (${metodoPagoNorm})`,
                         gastoId: gasto.id,
                         fecha: new Date()
                     }
                 })
             }
        }
        // ------------------------

        // Actualizar el gasto
        const gastoActualizado = await tx.gasto.update({
            where: { id: parseInt(gastoId) },
            data: {
                saldoPendiente: nuevoSaldo,
                estado: nuevoEstado
            },
            include: {
                pagos: {
                    orderBy: { fecha: 'desc' },
                    include: { usuario: true }
                }
            }
        })

        return {
            pago,
            gasto: gastoActualizado
        }
    })
}

/**
 * Obtener resumen de finanzas (Totales por cobrar y por pagar)
 */
async function obtenerResumenFinanzas() {
    // Total por cobrar (Deudas de clientes)
    const porCobrar = await prisma.deuda.aggregate({
        _sum: { saldoPendiente: true },
        where: { estado: { in: ['PENDIENTE', 'VENCIDO'] } }
    })

    // Total por pagar (Gastos del negocio)
    const porPagar = await prisma.gasto.aggregate({
        _sum: { saldoPendiente: true },
        where: { estado: { in: ['PENDIENTE', 'VENCIDO'] } }
    })

    return {
        totalPorCobrar: porCobrar._sum.saldoPendiente || 0,
        totalPorPagar: porPagar._sum.saldoPendiente || 0
    }
}

module.exports = {
    listarGastos,
    obtenerGastoPorId,
    crearGasto,
    registrarPagoGasto,
    obtenerResumenFinanzas
}
