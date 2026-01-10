const { prisma } = require('../../infraestructura/bd')
const bcrypt = require('bcryptjs')
const { ADMIN_CORREO } = require('../../configuracion/entorno')
const { supabase } = require('../../infraestructura/supabase')

async function registrar({ email, password, options }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options
  })

  if (error) throw new Error(error.message)
  
  // Return the user and session (if auto-confirm is on)
  return { user: data.user, session: data.session }
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
  
  // The trigger 'handle_new_user' will create the Prisma record.
  // We wait a bit or just return the auth user.
  // Ideally, we should poll Prisma to get the created user ID, but for now:
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

  const roles = usuario.roles.map(ur => ur.rol.nombre)
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
      modulos = asignados.filter(m => activos.includes(m))
    }
  }

  // Return the Supabase Session Token instead of signing our own
  return { usuario, roles, permisos, negocioId, modulos, adminPorDefecto, session }
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

module.exports = { registrar, crearAdministrador, crearUsuarioConRoles, ingresar, obtenerModulosActivosNegocio }
