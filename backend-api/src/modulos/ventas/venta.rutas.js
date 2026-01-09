const { listarVentas, obtenerVentaPorId, crearVenta } = require('./venta.servicio')

async function registrarRutasVenta(app) {
  app.get('/ventas', { preHandler: [app.requiereModulo('ventas'), app.requierePermiso('VER_VENTAS')] }, async (req, res) => {
    const datos = await listarVentas()
    return res.send(datos)
  })

  app.get('/ventas/:id', { preHandler: [app.requiereModulo('ventas'), app.requierePermiso('VER_VENTAS')] }, async (req, res) => {
    const id = Number(req.params.id)
    const dato = await obtenerVentaPorId(id)
    if (!dato) {
      res.code(404)
      return { mensaje: 'No encontrado' }
    }
    return dato
  })

  app.post('/ventas', { preHandler: [app.requiereModulo('ventas'), app.requierePermiso('CREAR_VENTA')] }, async (req, res) => {
    const creado = await crearVenta({ ...req.body, usuarioId: req.user.id })
    res.code(201)
    return creado
  })
}

module.exports = { registrarRutasVenta }
