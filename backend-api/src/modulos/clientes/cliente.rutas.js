const {
  listarClientes,
  obtenerClientePorId,
  obtenerEstadoCuentaCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  validarCreditoDisponible
} = require('./cliente.servicio')

async function registrarRutasCliente(app) {
  // Listar todos los clientes
  app.get('/clientes', { preHandler: [app.requiereModulo('clientes'), app.requierePermiso('VER_CLIENTES')] }, async (req, res) => {
    const datos = await listarClientes()
    return res.send(datos)
  })

  // Obtener un cliente por ID
  app.get('/clientes/:id', { preHandler: [app.requiereModulo('clientes'), app.requierePermiso('VER_CLIENTES')] }, async (req, res) => {
    const id = Number(req.params.id)
    const dato = await obtenerClientePorId(id)
    if (!dato) {
      res.code(404)
      return { mensaje: 'No encontrado' }
    }
    return dato
  })

  // Obtener estado de cuenta de un cliente (deudas, abonos, crédito disponible)
  app.get('/clientes/:id/estado-cuenta', { preHandler: [app.requiereModulo('clientes'), app.requierePermiso('VER_CLIENTES')] }, async (req, res) => {
    const id = Number(req.params.id)
    try {
      const estadoCuenta = await obtenerEstadoCuentaCliente(id)
      return estadoCuenta
    } catch (error) {
      res.code(404)
      return { mensaje: error.message }
    }
  })

  // Validar crédito disponible de un cliente
  app.post('/clientes/:id/validar-credito', { preHandler: [app.requiereModulo('clientes'), app.requierePermiso('VER_CLIENTES')] }, async (req, res) => {
    const clienteId = Number(req.params.id)
    const { monto } = req.body

    if (!monto || monto <= 0) {
      res.code(400)
      return { mensaje: 'El monto debe ser mayor a 0' }
    }

    try {
      const validacion = await validarCreditoDisponible(clienteId, Number(monto))
      return validacion
    } catch (error) {
      res.code(404)
      return { mensaje: error.message }
    }
  })

  // Crear un nuevo cliente
  app.post('/clientes', { preHandler: [app.requiereModulo('clientes'), app.requierePermiso('CREAR_CLIENTE')] }, async (req, res) => {
    const cuerpo = req.body
    try {
      const creado = await crearCliente(cuerpo)
      res.code(201)
      return creado
    } catch (error) {
      console.error('Error al crear cliente:', error)
      res.code(400)
      return { mensaje: error.message }
    }
  })

  // Actualizar un cliente
  app.put('/clientes/:id', { preHandler: [app.requiereModulo('clientes'), app.requierePermiso('EDITAR_CLIENTE')] }, async (req, res) => {
    const id = Number(req.params.id)
    const cuerpo = req.body
    const actualizado = await actualizarCliente(id, cuerpo)
    return actualizado
  })

  // Eliminar un cliente
  app.delete('/clientes/:id', { preHandler: [app.requiereModulo('clientes'), app.requierePermiso('ELIMINAR_CLIENTE')] }, async (req, res) => {
    const id = Number(req.params.id)
    try {
      const eliminado = await eliminarCliente(id)
      return eliminado
    } catch (error) {
      res.code(400)
      return { mensaje: error.message }
    }
  })
}

module.exports = { registrarRutasCliente }
