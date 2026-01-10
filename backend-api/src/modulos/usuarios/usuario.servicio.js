const { prisma } = require('../../infraestructura/bd')
// const { ADMIN_CORREO } = require('../../configuracion/entorno')
const bcrypt = require('bcryptjs')
const { supabase } = require('../../infraestructura/supabase')

async function listarUsuarios(filtro = {}) {
  const usuarios = await prisma.usuario.findMany({
    where: filtro,
    orderBy: { id: 'asc' },
    select: {
      id: true,
      nombre: true,
      correo: true,
      activo: true,
      creadoEn: true,
      roles: { select: { rol: { select: { nombre: true } } } }
    }
  })
  return usuarios.map(u => ({ ...u, roles: u.roles.map(r => r.rol.nombre) }))
}

async function obtenerUsuarioPorId(id) {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      correo: true,
      activo: true,
      creadoEn: true,
      negocioId: true,
      roles: { select: { rol: { select: { nombre: true, permisos: { select: { permiso: { select: { clave: true } } } } } } } },
      permisos: { select: { permiso: { select: { clave: true } } } },
      modulos: { select: { moduloId: true } }
    }
  })
  if (usuario) {
    const rolesNombres = usuario.roles.map(r => r.rol.nombre)
    // Flatten permissions from roles
    const permisosRoles = usuario.roles.flatMap(r => r.rol.permisos.map(p => p.permiso.clave))
    // Flatten direct permissions
    const permisosDirectos = usuario.permisos.map(p => p.permiso.clave)
    
    usuario.roles = rolesNombres
    usuario.permisos = [...new Set([...permisosRoles, ...permisosDirectos])]
    usuario.permisosDirectos = permisosDirectos // To distinguish in frontend if needed
    usuario.modulos = Array.isArray(usuario.modulos) ? usuario.modulos.map(m => m.moduloId) : []
  }
  return usuario
}

async function actualizarUsuario(id, datos) {
  const campos = {}
  if (typeof datos.nombre === 'string') campos.nombre = datos.nombre
  if (typeof datos.correo === 'string') campos.correo = datos.correo
  if (typeof datos.activo === 'boolean') campos.activo = datos.activo
  const usuario = await prisma.usuario.update({
    where: { id },
    data: campos,
    select: {
      id: true,
      nombre: true,
      correo: true,
      activo: true,
      roles: { select: { rol: { select: { nombre: true } } } }
    }
  })
  usuario.roles = usuario.roles.map(r => r.rol.nombre)
  return usuario
}

async function cambiarPassword(id, nueva) {
  const passwordHash = await bcrypt.hash(nueva, 10)
  await prisma.usuario.update({ where: { id }, data: { passwordHash } })
  return { id }
}

async function activarUsuario(id) {
  return prisma.usuario.update({ where: { id }, data: { activo: true }, select: { id: true, activo: true } })
}

async function desactivarUsuario(id) {
  const usuario = await prisma.usuario.findUnique({ where: { id } })
  /*
  if (usuario && usuario.correo === ADMIN_CORREO) {
    throw new Error('No se puede desactivar el usuario administrador principal')
  }
  */
  return prisma.usuario.update({ where: { id }, data: { activo: false }, select: { id: true, activo: true } })
}

async function eliminarUsuario(id) {
  const usuario = await prisma.usuario.findUnique({ where: { id } })
  if (!usuario) {
    throw new Error('Usuario no encontrado')
  }
  /*
  if (usuario.correo === ADMIN_CORREO) {
    throw new Error('No se puede eliminar el usuario administrador principal')
  }
  */

  // Verificar si tiene ventas (Restricción de FK)
  const ventas = await prisma.venta.count({ where: { usuarioId: id } })
  if (ventas > 0) {
    throw new Error('No se puede eliminar el usuario porque tiene ventas asociadas. Considere desactivarlo.')
  }

  // Eliminar dependencias antes de eliminar el usuario
  const [_, __, usuarioEliminado] = await prisma.$transaction([
    prisma.usuarioRol.deleteMany({ where: { usuarioId: id } }),
    prisma.usuarioPermiso.deleteMany({ where: { usuarioId: id } }),
    prisma.usuario.delete({ where: { id } })
  ])
  
  return usuarioEliminado
}

async function asignarRolesAUsuario(id, roles = []) {
  await prisma.usuarioRol.deleteMany({ where: { usuarioId: id } })
  if (Array.isArray(roles) && roles.length) {
    const rolesDb = await prisma.rol.findMany({ where: { nombre: { in: roles } } })
    for (const r of rolesDb) await prisma.usuarioRol.create({ data: { usuarioId: id, rolId: r.id } })
  }
  return { id }
}

async function crearUsuario(datos, adminId = null) {
  // 1. Create user in Supabase Auth
  // This triggers 'handle_new_user' in Postgres which creates the 'Usuario' record
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: datos.correo,
    password: datos.password,
    email_confirm: true,
    user_metadata: {
      full_name: datos.nombre,
      business_id: datos.negocioId ? Number(datos.negocioId) : null,
      role: datos.rol
    }
  })

  if (authError) throw new Error(authError.message)
  
  const authUserId = authData.user.id

  // 2. Wait/Retry until Usuario record exists (created by trigger)
  let usuario = null
  for (let i = 0; i < 5; i++) {
    usuario = await prisma.usuario.findUnique({ where: { authUserId } })
    if (usuario) break
    await new Promise(r => setTimeout(r, 500)) // Wait 500ms
  }

  if (!usuario) throw new Error('Error al sincronizar usuario con base de datos')

  // 3. Assign Assignments (Roles, Permissions, Modules)
  // The trigger might have assigned the default role (ADMIN or TRABAJADOR), but we want to ensure exact permissions setup
  
  if (datos.rol) {
    const rol = await prisma.rol.findUnique({ 
      where: { nombre: datos.rol },
      include: { permisos: true }
    })
    
    // Check if role was already assigned by trigger
    const roleExists = await prisma.usuarioRol.findFirst({
        where: { usuarioId: usuario.id, rolId: rol.id }
    })

    if (rol && !roleExists) {
      await prisma.usuarioRol.create({
        data: { usuarioId: usuario.id, rolId: rol.id }
      })
    }

    if (rol) {
      // 2. Asignar Permisos del Rol directamente al Usuario (si es la política)
      if (rol.permisos && rol.permisos.length > 0) {
        const permsData = rol.permisos.map(rp => ({
          usuarioId: usuario.id,
          permisoId: rp.permisoId
        }))
        await prisma.usuarioPermiso.createMany({ data: permsData, skipDuplicates: true })
      }

      // 3. Asignar Módulos Iniciales
      let modulosParaAsignar = []
      if (datos.rol === 'ADMIN') {
        if (usuario.negocioId) {
          const negocioModulos = await prisma.negocioModulo.findMany({
            where: { negocioId: usuario.negocioId, activo: true },
            select: { moduloId: true }
          })
          modulosParaAsignar = negocioModulos.map(nm => nm.moduloId)
        }
      } else if (['TRABAJADOR', 'CAJERO'].includes(datos.rol)) {
        modulosParaAsignar = ['dashboard']
      }

      if (modulosParaAsignar.length > 0) {
        await prisma.usuarioModulo.createMany({
          data: modulosParaAsignar.map(m => ({ usuarioId: usuario.id, moduloId: m })),
          skipDuplicates: true
        })
      }
    }
  }

  // Log Audit
  if (adminId) {
      await prisma.auditLog.create({
          data: {
              usuarioId: adminId, // The admin who performed the action
              negocioId: usuario.negocioId,
              accion: 'CREAR_USUARIO',
              detalle: `Creación de usuario: ${usuario.nombre} (${usuario.correo}) con rol ${datos.rol || 'TRABAJADOR'}`
          }
      })
  }

  return obtenerUsuarioPorId(usuario.id)
}

async function asignarPermisosDirectos(id, permisos = [], adminId = null) {
  // Clear existing direct permissions
  await prisma.usuarioPermiso.deleteMany({ where: { usuarioId: id } })
  
  if (Array.isArray(permisos) && permisos.length > 0) {
    const permsDb = await prisma.permiso.findMany({ where: { clave: { in: permisos } } })
    for (const p of permsDb) {
      await prisma.usuarioPermiso.create({
        data: { usuarioId: id, permisoId: p.id }
      })
    }
  }

  // Log audit
  if (adminId) {
    await prisma.auditLog.create({
      data: {
        usuarioId: adminId,
        accion: 'ASIGNAR_PERMISOS_USUARIO',
        detalle: `Usuario ID: ${id}, Permisos: ${permisos.join(', ')}`
      }
    })
  }

  return obtenerUsuarioPorId(id)
}

async function asignarModulosAUsuario(id, modulos = []) {
  await prisma.usuarioModulo.deleteMany({ where: { usuarioId: id } })
  const ids = Array.from(new Set((Array.isArray(modulos) ? modulos : []).map(m => String(m)).filter(Boolean)))
  if (ids.length) {
    const existentes = await prisma.modulo.findMany({ where: { id: { in: ids } }, select: { id: true } })
    const validos = existentes.map(m => m.id)
    if (validos.length) {
      await prisma.usuarioModulo.createMany({
        data: validos.map(moduloId => ({ usuarioId: id, moduloId })),
        skipDuplicates: true
      })
    }
  }
  return obtenerUsuarioPorId(id)
}

module.exports = { listarUsuarios, obtenerUsuarioPorId, actualizarUsuario, cambiarPassword, activarUsuario, desactivarUsuario, eliminarUsuario, asignarRolesAUsuario, crearUsuario, asignarPermisosDirectos, asignarModulosAUsuario }