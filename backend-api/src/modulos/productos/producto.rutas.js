const {
  listarProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto
} = require('./producto.servicio')

async function registrarRutasProducto(app) {
  app.get('/productos', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('VER_INVENTARIO')] }, async (req, res) => {
    const datos = await listarProductos()
    return res.send(datos)
  })

  app.get('/productos/:id', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('VER_INVENTARIO')] }, async (req, res) => {
    const id = Number(req.params.id)
    const dato = await obtenerProductoPorId(id)
    if (!dato) {
      res.code(404)
      return { mensaje: 'No encontrado' }
    }
    return dato
  })

  app.post('/productos', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('CREAR_PRODUCTO')] }, async (req, res) => {
    const cuerpo = req.body
    const creado = await crearProducto(cuerpo)
    res.code(201)
    return creado
  })

  app.put('/productos/:id', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('EDITAR_PRODUCTO')] }, async (req, res) => {
    const id = Number(req.params.id)
    const cuerpo = req.body
    const actualizado = await actualizarProducto(id, cuerpo)
    return actualizado
  })

  app.delete('/productos/:id', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('ELIMINAR_PRODUCTO')] }, async (req, res) => {
    const id = Number(req.params.id)
    const eliminado = await eliminarProducto(id)
    return eliminado
  })
}

module.exports = { registrarRutasProducto }
