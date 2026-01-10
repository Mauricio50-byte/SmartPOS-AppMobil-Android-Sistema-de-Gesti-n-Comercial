const {
  listarProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto
} = require('./producto.servicio')

async function registrarRutasProducto(app) {
  app.get('/productos', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('VER_INVENTARIO')] }, async (req, res) => {
    const negocioId = req.user.negocioId
    const datos = await listarProductos(negocioId)
    return res.send(datos)
  })

  app.get('/productos/:id', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('VER_INVENTARIO')] }, async (req, res) => {
    const id = Number(req.params.id)
    const negocioId = req.user.negocioId
    const dato = await obtenerProductoPorId(id, negocioId)
    if (!dato) {
      res.code(404)
      return { mensaje: 'No encontrado' }
    }
    return dato
  })

  app.post('/productos', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('CREAR_PRODUCTO')] }, async (req, res) => {
    const cuerpo = req.body
    const negocioId = req.user.negocioId
    const creado = await crearProducto(cuerpo, negocioId)
    res.code(201)
    return creado
  })

  app.put('/productos/:id', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('EDITAR_PRODUCTO')] }, async (req, res) => {
    const id = Number(req.params.id)
    const cuerpo = req.body
    const negocioId = req.user.negocioId
    const actualizado = await actualizarProducto(id, cuerpo, negocioId)
    return actualizado
  })

  app.delete('/productos/:id', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('ELIMINAR_PRODUCTO')] }, async (req, res) => {
    const id = Number(req.params.id)
    const negocioId = req.user.negocioId
    const eliminado = await eliminarProducto(id, negocioId)
    return eliminado
  })
}

module.exports = { registrarRutasProducto }
