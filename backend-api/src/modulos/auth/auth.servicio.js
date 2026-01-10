const { prisma } = require('../../infraestructura/bd')
const bcrypt = require('bcryptjs')
const { supabase } = require('../../infraestructura/supabase')

async function registrar({ email, password, options }) {

  // Use admin.createUser to bypass "Invalid email" errors often seen with signUp() + service_role
  // We auto-confirm the email so the user can login immediately.
  const { data: userDat, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: options?.data
  })

  if (createError) throw new Error(createError.message)

  // Polling to wait for Trigger to create the User in Prisma
  let usuario = null;
  const authUserId = userDat.user.id;
  for (let i = 0; i < 10; i++) { // Wait up to 5 seconds (10 * 500ms)
    usuario = await prisma.usuario.findUnique({ where: { authUserId } })
    if (usuario) break
    await new Promise(r => setTimeout(r, 500))
  }

  if (usuario) {
    // If it's a new business (admin role), ensure modules are assigned
    // The trigger sets role 'ADMIN' if it created a new business.
    const esAdmin = await prisma.usuarioRol.findFirst({
      where: { usuarioId: usuario.id, rol: { nombre: 'ADMIN' } }
    })

    if (esAdmin && usuario.negocioId) {
      // 1. Activate all modules for the business if not already active
      const modulos = await prisma.modulo.findMany({ where: { activo: true } })
      
      // Check if business has modules
      const negocioModulosCount = await prisma.negocioModulo.count({ where: { negocioId: usuario.negocioId } })
      
      if (negocioModulosCount === 0) {
         // Create NegocioModulo entries
         await prisma.negocioModulo.createMany({
            data: modulos.map(m => ({ negocioId: usuario.negocioId, moduloId: m.id, activo: true })),
            skipDuplicates: true
         })
      }

      // 2. Assign all modules to the Admin user
      await prisma.usuarioModulo.createMany({
         data: modulos.map(m => ({ usuarioId: usuario.id, moduloId: m.id })),
         skipDuplicates: true
      })
    }

    // Log registration
    await prisma.auditLog.create({
        data: {
            usuarioId: usuario.id,
            negocioId: usuario.negocioId,
            accion: 'REGISTRO_NEGOCIO',
            detalle: `Registro de nuevo negocio: ${options?.data?.business_name || 'Sin nombre'}`
        }
    })
  }

  // Log in to get the session
  const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (loginError) throw new Error(loginError.message)

  return { user: userDat.user, session: sessionData.session, usuarioPrisma: usuario }
}

async function crearAdministrador({ nombre, correo, password }) {
  // Use Supabase Admin to create user (auto-confirm)
  const { data, error } = await supabase.auth.admin.createUser({
    email: correo,
    password: password,
    email_confirm: true,
    user_metadata: { full_name: nombre }
  })

  if (error) throw new Error(error.message)

  return { id: data.user.id, authUserId: data.user.id, email: data.user.email }
}

async function crearUsuarioConRoles({ nombre, correo, password, roles = [], negocioId }) {
  // Create user in Supabase with business_id in metadata
  const { data, error } = await supabase.auth.admin.createUser({
    email: correo,
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: nombre,
      business_id: negocioId,
      role: roles.includes('ADMIN') ? 'ADMIN' : 'TRABAJADOR'
    }
  })

  if (error) throw new Error(error.message)

  return { id: data.user.id }
}

async function ingresar({ correo, password }) {
  const c = (correo || '').trim().toLowerCase()

  // 1. Authenticate with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email: c,
    password: password
  })

  if (error) throw new Error('Credenciales inválidas')

  const session = data.session
  const authUserId = data.user.id

  // 2. Fetch User Profile from Prisma
  const usuario = await prisma.usuario.findUnique({
    where: { authUserId: authUserId },
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

  if (!usuario || !usuario.activo) throw new Error('Usuario no encontrado o inactivo')

  // Log Login
  await prisma.auditLog.create({
      data: {
          usuarioId: usuario.id,
          negocioId: usuario.negocioId,
          accion: 'LOGIN',
          detalle: 'Inicio de sesión exitoso'
      }
  })

  const roles = usuario.roles.map(ur => ur.rol.nombre)
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
      modulos = asignados.filter(m => activos.includes(m))
    }
  }

  // Return the Supabase Session Token instead of signing our own
  return { usuario, roles, permisos, negocioId, modulos, session }
}

async function obtenerModulosActivosNegocio(negocioId) {
  const negocioIdNum = Number(negocioId)
  if (!Number.isFinite(negocioIdNum)) return []
  const filas = await prisma.negocioModulo.findMany({
    where: { negocioId: negocioIdNum, activo: true },
    select: { moduloId: true },
    orderBy: { moduloId: 'asc' }
  })
  return filas.map(f => f.moduloId)
}

// Verifica si existe un usuario en Supabase Auth pero no en nuestra DB, y lo elimina si es necesario
async function limpiarUsuarioHuérfano(email) {
  // 1. Verificar si existe en nuestra DB (Prisma)
  const existeEnPrisma = await prisma.usuario.findUnique({ where: { correo: email } })

  if (existeEnPrisma) {
    return
  }

  // 2. Si no existe en Prisma, verificar si existe en Supabase Auth
  let foundUser = null;
  let page = 1;
  let hasMore = true;

  while (hasMore && !foundUser && page <= 5) { // Limit to 5 pages to avoid infinite loops
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: page, perPage: 100 })
    if (error || !users || users.length === 0) {
      hasMore = false;
      break;
    }

    foundUser = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())
    if (foundUser) break;

    if (users.length < 100) hasMore = false;
    page++;
  }

  if (foundUser) {
    console.log(`[Limpieza] Eliminando usuario huérfano de Supabase Auth: ${email} (${foundUser.id})`)
    await supabase.auth.admin.deleteUser(foundUser.id)
  }
}

module.exports = { registrar, crearAdministrador, crearUsuarioConRoles, ingresar, obtenerModulosActivosNegocio, limpiarUsuarioHuérfano }