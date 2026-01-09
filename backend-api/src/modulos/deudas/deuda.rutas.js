const {
    listarDeudas,
    obtenerDeudasPorCliente,
    obtenerDeudaPorId,
    registrarAbono,
    obtenerAbonosPorCliente,
    marcarDeudasVencidas
} = require('./deuda.servicio')

async function registrarRutasDeuda(app) {
    // Listar todas las deudas (con filtros opcionales)
    app.get('/deudas', { preHandler: [app.requiereModulo('finanzas'), app.requierePermiso('VER_FINANZAS')] }, async (req) => {
        const { estado, clienteId } = req.query
        const filtro = {}

        if (estado) filtro.estado = estado
        if (clienteId) filtro.clienteId = Number(clienteId)

        return listarDeudas(filtro)
    })

    // Obtener deudas de un cliente específico
    app.get('/deudas/cliente/:clienteId', { preHandler: [app.requiereModulo('finanzas'), app.requierePermiso('VER_FINANZAS')] }, async (req) => {
        const clienteId = Number(req.params.clienteId)
        return obtenerDeudasPorCliente(clienteId)
    })

    // Obtener una deuda específica
    app.get('/deudas/:id', { preHandler: [app.requiereModulo('finanzas'), app.requierePermiso('VER_FINANZAS')] }, async (req) => {
        const id = Number(req.params.id)
        const deuda = await obtenerDeudaPorId(id)
        if (!deuda) {
            req.code(404)
            return { mensaje: 'Deuda no encontrada' }
        }
        return deuda
    })

    // Registrar un abono a una deuda
    app.post('/deudas/:id/abonos', { preHandler: [app.requiereModulo('finanzas'), app.requierePermiso('REGISTRAR_MOVIMIENTO')] }, async (req, res) => {
        const deudaId = Number(req.params.id)
        const { monto, metodoPago, nota } = req.body
        const usuarioId = req.user?.id

        if (!monto || monto <= 0) {
            res.code(400)
            return { mensaje: 'El monto debe ser mayor a 0' }
        }

        try {
            const resultado = await registrarAbono({
                deudaId,
                monto: Number(monto),
                metodoPago,
                usuarioId,
                nota
            })

            res.code(201)
            return resultado
        } catch (error) {
            res.code(400)
            return { mensaje: error.message }
        }
    })

    // Obtener historial de abonos de un cliente
    app.get('/abonos/cliente/:clienteId', { preHandler: [app.requiereModulo('finanzas'), app.requierePermiso('VER_FINANZAS')] }, async (req) => {
        const clienteId = Number(req.params.clienteId)
        return obtenerAbonosPorCliente(clienteId)
    })

    // Marcar deudas vencidas (tarea programada o manual)
    app.post('/deudas/marcar-vencidas', { preHandler: [app.requiereModulo('finanzas'), app.requierePermiso('REGISTRAR_MOVIMIENTO')] }, async () => {
        return marcarDeudasVencidas()
    })
}

module.exports = { registrarRutasDeuda }
