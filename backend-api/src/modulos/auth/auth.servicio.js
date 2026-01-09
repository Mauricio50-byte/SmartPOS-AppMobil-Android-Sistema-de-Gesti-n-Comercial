const { prisma } = require('../../infraestructura/bd')
const bcrypt = require('bcryptjs')
const { ADMIN_CORREO } = require('../../configuracion/entorno')

async function crearAdministrador({ nombre, correo, password }) {
  const c = (correo || '').trim().toLowerCase()
  const existe = await prisma.usuario.findUnique({ where: { correo: c } })
  if (existe) throw new Error('Correo ya registrado')
  const passwordHash = await bcrypt.hash(password, 10)
  const usuario = await prisma.usuario.create({ data: { nombre, correo: c, passwordHash } })
  const rolAdmin = await prisma.rol.findUnique({ where: { nombre: 'ADMIN' } })
  if (rolAdmin) await prisma.usuarioRol.create({ data: { usuarioId: usuario.id, rolId: rolAdmin.id } })
  return usuario
}

async function crearUsuarioConRoles({ nombre, correo, password, roles = [] }) {
  const c = (correo || '').trim().toLowerCase()
  const existe = await prisma.usuario.findUnique({ where: { correo: c } })
  if (existe) throw new Error('Correo ya registrado')
  const passwordHash = await bcrypt.hash(password, 10)
  const usuario = await prisma.usuario.create({ data: { nombre, correo: c, passwordHash } })
  if (Array.isArray(roles) && roles.length > 0) {
    const rolesDb = await prisma.rol.findMany({ where: { nombre: { in: roles } } })
    for (const r of rolesDb) {
      await prisma.usuarioRol.create({ data: { usuarioId: usuario.id, rolId: r.id } })
    }
  }
  return usuario
}

async function ingresar({ correo, password }) {
  const c = (correo || '').trim().toLowerCase()
  // Incluir tanto los permisos del rol como los permisos directos del usuario
  const usuario = await prisma.usuario.findUnique({ 
    where: { correo: c }, 
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
  if (!usuario || !usuario.activo) throw new Error('Credenciales inválidas')
  const ok = await bcrypt.compare(password, usuario.passwordHash)
  if (!ok) throw new Error('Credenciales inválidas')
  const roles = usuario.roles.map(ur => ur.rol.nombre)
  // YA NO combinar permisos del rol. Solo permisos directos.
  // El rol es solo un estado inicial.
  // const permisosRoles = usuario.roles.flatMap(ur => ur.rol.permisos.map(rp => rp.permiso.clave))
  const permisosDirectos = usuario.permisos.map(up => up.permiso.clave)
  const permisos = Array.from(new Set([...permisosDirectos]))
  const negocioId = usuario.negocioId ?? null
  const adminPorDefecto = String(usuario.correo || '').trim().toLowerCase() === String(ADMIN_CORREO || '').trim().toLowerCase()
  let modulos = []
  if (negocioId) {
    const activos = await obtenerModulosActivosNegocio(negocioId)
    // Si es admin por defecto, mantenemos acceso total como respaldo
    if (adminPorDefecto) {
      modulos = activos
    } else {
      const asignados = Array.isArray(usuario.modulos) ? usuario.modulos.map(m => m.moduloId) : []
      // Solo permitir módulos asignados que también estén activos en el negocio
      modulos = asignados.filter(m => activos.includes(m))
    }
  }
  return { usuario, roles, permisos, negocioId, modulos, adminPorDefecto }
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

module.exports = { crearAdministrador, crearUsuarioConRoles, ingresar, obtenerModulosActivosNegocio }
