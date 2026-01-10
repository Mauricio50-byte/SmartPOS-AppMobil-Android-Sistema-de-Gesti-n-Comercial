const cajaServicio = require('./caja.servicio')

async function registrarRutasCaja(app) {
  // Abrir caja
  app.post('/caja/abrir', {
    preHandler: [app.requierePermiso('ABRIR_CAJA')]
  }, async (req, res) => {
    const { montoInicial, observaciones } = req.body
    const usuarioId = req.user.id
    const negocioId = req.user.negocioId
    try {
      const caja = await cajaServicio.abrirCaja({ usuarioId, montoInicial, observaciones, negocioId })
      return caja
    } catch (error) {
      console.error('Error al abrir caja:', error)
      res.code(400).send({ mensaje: error.message })
    }
  })

  // Cerrar caja
  app.post('/caja/cerrar', {
    preHandler: [app.requierePermiso('CERRAR_CAJA')]
  }, async (req, res) => {
    const { montoFinal, observaciones } = req.body
    const usuarioId = req.user.id
    const negocioId = req.user.negocioId
    try {
      const caja = await cajaServicio.cerrarCaja({ usuarioId, montoFinal, observaciones, negocioId })
      return caja
    } catch (error) {
      console.error('Error al cerrar caja:', error)
      res.code(400).send({ mensaje: error.message })
    }
  })

  // Registrar movimiento manual (Ingreso/Egreso)
  app.post('/caja/movimiento', {
    preHandler: [app.requierePermiso('REGISTRAR_MOVIMIENTO')]
  }, async (req, res) => {
    const { tipo, monto, descripcion } = req.body // tipo: INGRESO, EGRESO
    const usuarioId = req.user.id
    const negocioId = req.user.negocioId
    try {
      const movimiento = await cajaServicio.registrarMovimiento({ 
        usuarioId, 
        tipo, 
        monto, 
        descripcion,
        negocioId
      })
      return movimiento
    } catch (error) {
      console.error('Error al registrar movimiento:', error)
      res.code(400).send({ mensaje: error.message })
    }
  })

  // Obtener estado actual de mi caja
  app.get('/caja/estado', {
    preHandler: [app.requierePermiso('ABRIR_CAJA')] // O permiso básico
  }, async (req, res) => {
    const usuarioId = req.user.id
    const negocioId = req.user.negocioId
    const estado = await cajaServicio.obtenerEstadoCaja(usuarioId, negocioId)
    if (!estado) {
      // Retornar null en lugar de 404 para evitar errores en consola,
      // ya que "sin caja" es un estado válido.
      return null
    }
    return estado
  })

  // Historial de cierres (Admin o Finanzas)
  app.get('/caja/historial', {
    preHandler: [app.requierePermiso('VER_HISTORIAL_CAJA')]
  }, async (req, res) => {
    const { fechaInicio, fechaFin, usuarioId } = req.query
    const negocioId = req.user.negocioId
    return await cajaServicio.obtenerHistorial({ fechaInicio, fechaFin, usuarioId, negocioId })
  })
  
  // Estadísticas (Admin o Finanzas)
  app.get('/caja/estadisticas', {
    preHandler: [app.requierePermiso('VER_ESTADISTICAS_CAJA')]
  }, async (req, res) => {
    const { fechaInicio, fechaFin } = req.query
    const negocioId = req.user.negocioId
    return await cajaServicio.obtenerEstadisticas({ fechaInicio, fechaFin, negocioId })
  })
}

module.exports = { registrarRutasCaja }
