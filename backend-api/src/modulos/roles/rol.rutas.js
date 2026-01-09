const { listarRoles, crearRol, actualizarRol, listarPermisos } = require('./rol.servicio')

async function registrarRutasRol(app) {
  app.get('/roles', { preHandler: [app.requiereModulo('usuarios'), app.requierePermiso('VER_ROLES')] }, async () => {
    return listarRoles()
  })

  app.get('/permisos', { preHandler: [app.requiereModulo('usuarios'), app.requierePermiso('VER_ROLES')] }, async () => {
    return listarPermisos()
  })

  app.post('/roles', { preHandler: [app.requiereModulo('usuarios'), app.requierePermiso('CREAR_ROL')] }, async (req, res) => {
    const creado = await crearRol(req.body || {})
    res.code(201)
    return creado
  })

  app.put('/roles/:id', { preHandler: [app.requiereModulo('usuarios'), app.requierePermiso('EDITAR_ROL')] }, async (req) => {
    const id = Number(req.params.id)
    return actualizarRol(id, req.body)
  })
}

module.exports = { registrarRutasRol }
