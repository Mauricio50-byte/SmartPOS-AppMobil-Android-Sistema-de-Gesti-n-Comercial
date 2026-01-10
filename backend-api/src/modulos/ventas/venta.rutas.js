const { listarVentas, obtenerVentaPorId, crearVenta } = require('./venta.servicio')

async function registrarRutasVenta(app) {
  app.get('/ventas', { preHandler: [app.requiereModulo('ventas'), app.requierePermiso('VER_VENTAS')] }, async (req, res) => {
    const negocioId = req.user.negocioId
    const datos = await listarVentas({ negocioId })
    return res.send(datos)
  })

  app.get('/ventas/:id', { preHandler: [app.requiereModulo('ventas'), app.requierePermiso('VER_VENTAS')] }, async (req, res) => {
    const id = Number(req.params.id)
    const negocioId = req.user.negocioId
    const dato = await obtenerVentaPorId(id, negocioId)
    if (!dato) {
      res.code(404)
      return { mensaje: 'No encontrado' }
    }
    return dato
  })

  app.post('/ventas', { preHandler: [app.requiereModulo('ventas'), app.requierePermiso('CREAR_VENTA')] }, async (req, res) => {
    const negocioId = req.user.negocioId
    const creado = await crearVenta({ ...req.body, usuarioId: req.user.id, negocioId })
    res.code(201)
    return creado
  })
}

module.exports = { registrarRutasVenta }
