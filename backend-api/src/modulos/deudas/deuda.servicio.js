const { prisma } = require('../../infraestructura/bd')

/**
 * Listar todas las deudas con filtros opcionales
 */
async function listarDeudas(filtro = {}) {
    return prisma.deuda.findMany({
        where: filtro,
        include: {
            cliente: true,
            venta: {
                include: {
                    detalles: {
                        include: { producto: true }
                    }
                }
            },
            abonos: {
                orderBy: { fecha: 'desc' }
            }
        },
        orderBy: { fechaCreacion: 'desc' }
    })
}

/**
 * Obtener deudas pendientes de un cliente específico
 */
async function obtenerDeudasPorCliente(clienteId) {
    return prisma.deuda.findMany({
        where: {
            clienteId,
            estado: { in: ['PENDIENTE', 'VENCIDO'] }
        },
        include: {
            venta: {
                include: {
                    detalles: {
                        include: { producto: true }
                    }
                }
            },
            abonos: {
                orderBy: { fecha: 'desc' }
            }
        },
        orderBy: { fechaCreacion: 'desc' }
    })
}

/**
 * Obtener una deuda específica por ID
 */
async function obtenerDeudaPorId(id) {
    return prisma.deuda.findUnique({
        where: { id },
        include: {
            cliente: true,
            venta: {
                include: {
                    detalles: {
                        include: { producto: true }
                    },
                    usuario: true
                }
            },
            abonos: {
                orderBy: { fecha: 'desc' }
            }
        }
    })
}

/**
 * Crear una deuda (se llama automáticamente al crear una venta fiada)
 */
async function crearDeuda(datos) {
    const { clienteId, ventaId, montoTotal, fechaVencimiento } = datos

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
    if (!cliente) throw new Error('Cliente no encontrado')

    // Crear la deuda
    const deuda = await prisma.deuda.create({
        data: {
            clienteId,
            ventaId,
            montoTotal,
            saldoPendiente: montoTotal,
            fechaVencimiento
        }
    })

    // Actualizar el saldo de deuda del cliente
    await prisma.cliente.update({
        where: { id: clienteId },
        data: {
            saldoDeuda: { increment: montoTotal }
        }
    })

    return deuda
}

/**
 * Registrar un abono a una deuda
 */
async function registrarAbono(datos) {
    const { deudaId, monto, metodoPago = 'EFECTIVO', usuarioId, nota } = datos

    return prisma.$transaction(async (tx) => {
        // Obtener la deuda
        const deuda = await tx.deuda.findUnique({ where: { id: deudaId } })
        if (!deuda) throw new Error('Deuda no encontrada')
        if (deuda.estado === 'PAGADO') throw new Error('Esta deuda ya está pagada')

        // Validar que el monto no sea mayor al saldo pendiente
        if (monto > deuda.saldoPendiente) {
            throw new Error(`El monto del abono ($${monto}) no puede ser mayor al saldo pendiente ($${deuda.saldoPendiente})`)
        }

        // Crear el abono
        const abono = await tx.abono.create({
            data: {
                deudaId,
                clienteId: deuda.clienteId,
                monto,
                metodoPago,
                usuarioId,
                nota
            }
        })

        // Calcular nuevo saldo
        const nuevoSaldo = deuda.saldoPendiente - monto
        const nuevoEstado = nuevoSaldo === 0 ? 'PAGADO' : deuda.estado

        // Actualizar la deuda
        await tx.deuda.update({
            where: { id: deudaId },
            data: {
                saldoPendiente: nuevoSaldo,
                estado: nuevoEstado
            }
        })

        // Actualizar el saldo de deuda del cliente
        await tx.cliente.update({
            where: { id: deuda.clienteId },
            data: {
                saldoDeuda: { decrement: monto }
            }
        })

        // Actualizar la venta si la deuda está pagada
        if (nuevoEstado === 'PAGADO') {
            await tx.venta.update({
                where: { id: deuda.ventaId },
                data: {
                    estadoPago: 'PAGADO',
                    montoPagado: deuda.montoTotal,
                    saldoPendiente: 0
                }
            })
        } else {
            // Actualizar monto pagado parcial
            const venta = await tx.venta.findUnique({ where: { id: deuda.ventaId } })
            await tx.venta.update({
                where: { id: deuda.ventaId },
                data: {
                    montoPagado: (venta?.montoPagado || 0) + monto,
                    saldoPendiente: nuevoSaldo
                }
            })
        }

        return {
            abono,
            deudaActualizada: await tx.deuda.findUnique({
                where: { id: deudaId },
                include: {
                    cliente: true,
                    abonos: {
                        orderBy: { fecha: 'desc' }
                    }
                }
            })
        }
    })
}

/**
 * Obtener historial de abonos de un cliente
 */
async function obtenerAbonosPorCliente(clienteId) {
    return prisma.abono.findMany({
        where: { clienteId },
        include: {
            deuda: {
                include: {
                    venta: true
                }
            }
        },
        orderBy: { fecha: 'desc' }
    })
}

/**
 * Marcar deudas vencidas
 */
async function marcarDeudasVencidas() {
    const ahora = new Date()

    const resultado = await prisma.deuda.updateMany({
        where: {
            estado: 'PENDIENTE',
            fechaVencimiento: {
                lt: ahora
            }
        },
        data: {
            estado: 'VENCIDO'
        }
    })

    return resultado
}

module.exports = {
    listarDeudas,
    obtenerDeudasPorCliente,
    obtenerDeudaPorId,
    crearDeuda,
    registrarAbono,
    obtenerAbonosPorCliente,
    marcarDeudasVencidas
}
