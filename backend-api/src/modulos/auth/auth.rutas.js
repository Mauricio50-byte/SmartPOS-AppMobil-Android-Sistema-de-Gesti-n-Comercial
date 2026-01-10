const { registrar, crearAdministrador, crearUsuarioConRoles, ingresar, obtenerModulosActivosNegocio } = require('./auth.servicio')
const { prisma } = require('../../infraestructura/bd')
const { ADMIN_CORREO } = require('../../configuracion/entorno')

async function registrarRutasAuth(app) {
  app.decorate('autenticar', async (req, res) => { await req.jwtVerify() })

  // Nuevo endpoint de registro público
  app.post('/auth/registrar', async (req, res) => {
    const { email, password, options } = req.body || {}
    try {
      const { user, session } = await registrar({ email, password, options })
      // Si hay sesión (login automático), devolver token
      if (session) {
        // Necesitamos esperar a que el trigger cree el usuario en Prisma para devolver el perfil completo?
        // Por ahora devolvemos el token de Supabase y el usuario básico.
        return { 
          token: session.access_token, 
          usuario: { 
            id: user.id, // Supabase ID, frontend debe manejar esto
            email: user.email,
            // Perfil incompleto hasta que se cree en DB
          }
        }
      }
      return { mensaje: 'Registro exitoso. Por favor verifica tu correo.' }
    } catch (e) {
      res.code(400)
      return { mensaje: e.message }
    }
  })

  app.post('/auth/ingresar', async (req, res) => {
    const { correo, password } = req.body || {}
    try {
      const { usuario, roles, permisos, negocioId, modulos, adminPorDefecto, session } = await ingresar({ correo, password })
      
      // SIEMPRE firmamos nuestro propio token para compatibilidad con la API del Backend
      const token = await res.jwtSign({ id: usuario.id, roles, permisos, nombre: usuario.nombre, correo: usuario.correo, negocioId, modulos, adminPorDefecto })
      
      return {
        token,
        session, // Devolvemos también la sesión de Supabase para que el Frontend la use si es necesario
        usuario: {
          id: usuario.id,
          roles,
          permisos,
          nombre: usuario.nombre,
          correo: usuario.correo,
          negocioId,
          modulos,
          adminPorDefecto
        }
      }
    } catch (e) {
      if (e && (e.message === 'Credenciales inválidas' || e.message.includes('Invalid login'))) {
        res.code(401)
        return { mensaje: 'Credenciales inválidas' }
      }
      throw e
    }
  })

  app.post('/auth/registrar-admin', async (req, res) => {
    const totalAdmins = await prisma.usuario.count({ where: { roles: { some: { rol: { nombre: 'ADMIN' } } } } })
    if (totalAdmins > 0) {
      await req.jwtVerify()
      const roles = req.user?.roles || []
      const adminPorDefecto = req.user?.adminPorDefecto === true
      if (!(roles.includes('ADMIN') && adminPorDefecto)) { res.code(403); throw new Error('No autorizado') }
    }
    const { nombre, correo, password } = req.body || {}
    const creado = await crearAdministrador({ nombre, correo, password })
    res.code(201)
    return { id: creado.id }
  })

  app.post('/auth/registrar-usuario', { preHandler: [app.requierePermiso('CREAR_USUARIO')] }, async (req, res) => {
    const { nombre, correo, password, roles = [] } = req.body || {}
    
    // Obtener negocioId del usuario actual
    // Nota: req.user viene del token decodificado.
    // Si usamos token de Supabase, fastify-jwt podría necesitar configuración para decodificarlo correctamente o usamos user info de DB.
    // En 'ingresar' devolvimos el token de Supabase.
    // Si fastify-jwt verifica el token de Supabase, el payload es diferente.
    
    // Asumimos que req.user tiene la info correcta (verificar estrategia de JWT)
    const negocioId = req.user?.negocioId;
    
    if (!negocioId) {
      res.code(400)
      throw new Error('No se puede crear usuario sin un negocio asociado')
    }

    const creado = await crearUsuarioConRoles({ nombre, correo, password, roles, negocioId })
    res.code(201)
    return { id: creado.id }
  })

  app.get('/auth/perfil', { preHandler: [app.autenticar] }, async (req, res) => {
    // Debug: Log para ver qué está llegando en el token
    // console.log('DEBUG /auth/perfil - req.user:', req.user)

    // Consultar la base de datos para obtener los permisos actualizados
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      include: {
        roles: {
          include: {
            rol: {
              include: {
                permisos: { include: { permiso: true } }
              }
            }
          }
        },
        permisos: { include: { permiso: true } },
        modulos: true
      }
    })

    if (!usuario || !usuario.activo) {
      console.warn('Usuario no encontrado o inactivo:', req.user.id)
      res.code(401)
      return { mensaje: 'Usuario no autorizado' }
    }

    const roles = usuario.roles.map(ur => ur.rol.nombre)
    // YA NO usar permisos del rol
    // const permisosRoles = usuario.roles.flatMap(ur => ur.rol.permisos.map(rp => rp.permiso.clave))
    const permisosDirectos = usuario.permisos.map(up => up.permiso.clave)
    const permisos = Array.from(new Set([...permisosDirectos]))

    const negocioId = usuario.negocioId ?? null
    const adminPorDefecto = String(usuario.correo || '').trim().toLowerCase() === String(ADMIN_CORREO || '').trim().toLowerCase()
    let modulos = []
    if (negocioId) {
      const activos = await obtenerModulosActivosNegocio(negocioId)
      if (adminPorDefecto) {
        modulos = activos
      } else {
        const asignados = Array.isArray(usuario.modulos) ? usuario.modulos.map(m => m.moduloId) : []
        // Solo permitir módulos asignados que también estén activos en el negocio
        modulos = asignados.filter(m => activos.includes(m))
      }
    }

    return {
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        roles,
        permisos,
        negocioId,
        modulos,
        adminPorDefecto
      },
      token: await res.jwtSign({ id: usuario.id, roles, permisos, nombre: usuario.nombre, correo: usuario.correo, negocioId, modulos, adminPorDefecto })
    }
  })
}

module.exports = { registrarRutasAuth }
