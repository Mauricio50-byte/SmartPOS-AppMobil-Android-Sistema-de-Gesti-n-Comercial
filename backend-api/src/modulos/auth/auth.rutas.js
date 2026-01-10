const { registrar, crearAdministrador, crearUsuarioConRoles, ingresar, obtenerModulosActivosNegocio, limpiarUsuarioHuérfano } = require('./auth.servicio')
const { prisma } = require('../../infraestructura/bd')
// const { ADMIN_CORREO } = require('../../configuracion/entorno')

async function registrarRutasAuth(app) {
  app.decorate('autenticar', async (req, res) => { await req.jwtVerify() })

  // Nuevo endpoint de registro público
  app.post('/auth/registrar', async (req, res) => {
    console.log('Solicitud de registro recibida:', req.body?.email);
    let { email, password, options } = req.body || {}

    if (email) email = email.trim();

    // Verificar si el usuario ya existe en nuestra base de datos (para evitar errores de triggers)
    const existeUsuario = await prisma.usuario.findUnique({ where: { correo: email } })
    if (existeUsuario) {
      res.code(400)
      return { mensaje: 'El correo ya está registrado en el sistema.' }
    }


    // Limpiar usuario huérfano si existe en Auth pero no en DB
    await limpiarUsuarioHuérfano(email);

    try {
      const { user, session, usuarioPrisma } = await registrar({ email, password, options })

      // Si hay sesión (login automático), devolver token
      if (session && usuarioPrisma) {
        // Construct user profile similar to 'ingresar'
        const roles = usuarioPrisma.roles.map(ur => ur.rol.nombre)
        const permisosDirectos = usuarioPrisma.permisos.map(up => up.permiso.clave)
        const permisos = Array.from(new Set([...permisosDirectos]))
        const negocioId = usuarioPrisma.negocioId ?? null
        
        let modulos = []
        if (negocioId) {
          const activos = await obtenerModulosActivosNegocio(negocioId)
          if (roles.includes('ADMIN')) {
            modulos = activos
          } else {
            const asignados = Array.isArray(usuarioPrisma.modulos) ? usuarioPrisma.modulos.map(m => m.moduloId) : []
            modulos = asignados.filter(m => activos.includes(m))
          }
        }

        // SIEMPRE firmamos nuestro propio token para compatibilidad con la API del Backend
        const token = await res.jwtSign({ 
            id: usuarioPrisma.id, 
            roles, 
            permisos, 
            nombre: usuarioPrisma.nombre, 
            correo: usuarioPrisma.correo, 
            negocioId, 
            modulos 
        })

        return {
          token, // Token backend (JWT Fastify)
          session, // Session Supabase
          usuario: {
            id: usuarioPrisma.id,
            nombre: usuarioPrisma.nombre,
            correo: usuarioPrisma.correo,
            roles,
            permisos,
            negocioId,
            modulos
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

    // Verificar duplicados
    const existe = await prisma.usuario.findUnique({ where: { correo } })
    if (existe) {
      res.code(400)
      throw new Error('El correo ya está registrado en el sistema')
    }

    const creado = await crearAdministrador({ nombre, correo, password })
    res.code(201)
    return { id: creado.id }
  })

  app.post('/auth/registrar-usuario', { preHandler: [app.requierePermiso('CREAR_USUARIO')] }, async (req, res) => {
    const { nombre, correo, password, roles = [] } = req.body || {}

    // Verificar si el usuario ya existe
    const existe = await prisma.usuario.findUnique({ where: { correo } })
    if (existe) {
      res.code(400)
      throw new Error('El correo ya está registrado en el sistema')
    }

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
    let modulos = []
    if (negocioId) {
      const activos = await obtenerModulosActivosNegocio(negocioId)
      if (roles.includes('ADMIN')) {
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
        modulos
      },
      token: await res.jwtSign({ id: usuario.id, roles, permisos, nombre: usuario.nombre, correo: usuario.correo, negocioId, modulos })
    }
  })
}

module.exports = { registrarRutasAuth }
