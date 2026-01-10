const { listarUsuarios, obtenerUsuarioPorId, actualizarUsuario, cambiarPassword, activarUsuario, desactivarUsuario, eliminarUsuario, asignarRolesAUsuario, crearUsuario, asignarPermisosDirectos, asignarModulosAUsuario } = require('./usuario.servicio')

async function registrarRutasUsuario(app) {
  app.post('/usuarios', { preHandler: [app.requiereModulo('usuarios'), app.requierePermiso('CREAR_USUARIO')] }, async (req, res) => {
    // Asignar el negocioId del creador al nuevo usuario si no viene en el body
    const datos = req.body || {}
    if (!datos.negocioId && req.user && req.user.negocioId) {
      datos.negocioId = req.user.negocioId
    }
    const usuario = await crearUsuario(datos)
    return usuario
  })

  // Asignar permisos directos: Solo Admin Principal (o permiso ADMIN)
  app.put('/usuarios/:id/permisos', { preHandler: [app.requiereModulo('usuarios'), app.requierePermiso('ADMIN')] }, async (req, res) => {
    const id = Number(req.params.id)
    const permisos = Array.isArray(req.body?.permisos) ? req.body.permisos : []
    const adminId = req.user?.id 
    return asignarPermisosDirectos(id, permisos, adminId)
  })

  app.get('/usuarios', { preHandler: [app.requiereModulo('usuarios'), app.requierePermiso('VER_USUARIOS')] }, async (req, res) => {
    const rol = req.query?.rol
    const activo = req.query?.activo
    const filtro = {}
    if (rol) {
      filtro.roles = {
        some: {
          rol: {
            nombre: rol
          }
        }
      }
    }
    if (typeof activo !== 'undefined') filtro.activo = activo === 'true'
    
    // Filtrar por negocio
    if (req.user && req.user.negocioId) {
      filtro.negocioId = req.user.negocioId
    }

    const datos = await listarUsuarios(filtro)
    return res.send(datos)
  })

  app.get('/usuarios/:id', { preHandler: [app.requiereModulo('usuarios'), app.requierePermiso('VER_USUARIOS')] }, async (req, res) => {
    const id = Number(req.params.id)
    const dato = await obtenerUsuarioPorId(id)
    if (!dato) { res.code(404); return { mensaje: 'No encontrado' } }
    return dato
  })

  app.put('/usuarios/:id', { preHandler: [app.requiereModulo('usuarios'), app.requierePermiso('EDITAR_USUARIO')] }, async (req, res) => {
    const id = Number(req.params.id)
    const actualizado = await actualizarUsuario(id, req.body || {})
    return actualizado
  })

  app.put('/usuarios/:id/password', { preHandler: [app.requiereModulo('usuarios'), app.requierePermiso('EDITAR_USUARIO')] }, async (req, res) => {
    const id = Number(req.params.id)
    const { nueva } = req.body || {}
    const resp = await cambiarPassword(id, nueva)
    return resp
  })

  app.put('/usuarios/:id/activar', { preHandler: [app.requiereModulo('usuarios'), app.requierePermiso('ACTIVAR_USUARIO')] }, async (req, res) => {
    const id = Number(req.params.id)
    return activarUsuario(id)
  })

  app.put('/usuarios/:id/desactivar', { preHandler: [app.requiereModulo('usuarios'), app.requierePermiso('ACTIVAR_USUARIO')] }, async (req, res) => {
    const id = Number(req.params.id)
    return desactivarUsuario(id)
  })

  app.delete('/usuarios/:id', { preHandler: [app.requiereModulo('usuarios'), app.requierePermiso('ELIMINAR_USUARIO')] }, async (req, res) => {
    const id = Number(req.params.id)
    return eliminarUsuario(id)
  })

  app.put('/usuarios/:id/roles', { preHandler: [app.requiereModulo('usuarios'), app.requierePermiso('ASIGNAR_ROLES')] }, async (req) => {
    const id = Number(req.params.id)
    const roles = Array.isArray(req.body?.roles) ? req.body.roles : []
    return asignarRolesAUsuario(id, roles)
  })

  // Asignar módulos: Requiere módulo 'modulos' y permiso 'GESTION_MODULOS'
  app.put('/usuarios/:id/modulos', { preHandler: [app.requiereModulo('modulos'), app.requierePermiso('GESTION_MODULOS')] }, async (req) => {
    const id = Number(req.params.id)
    const modulos = Array.isArray(req.body?.modulos) ? req.body.modulos : []
    return asignarModulosAUsuario(id, modulos)
  })
}

module.exports = { registrarRutasUsuario }
