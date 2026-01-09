const { prisma } = require('../../infraestructura/bd')

async function listarRoles() {
  return prisma.rol.findMany({ orderBy: { id: 'asc' }, include: { permisos: { include: { permiso: true } } } })
}

async function crearRol({ nombre, permisos = [] }) {
  const rol = await prisma.rol.create({ data: { nombre } })
  if (Array.isArray(permisos) && permisos.length) {
    const perms = await prisma.permiso.findMany({ where: { clave: { in: permisos } } })
    for (const p of perms) await prisma.rolPermiso.create({ data: { rolId: rol.id, permisoId: p.id } })
  }
  return rol
}

async function actualizarRol(id, { nombre, permisos = null }) {
  const rol = await prisma.rol.update({ where: { id }, data: { nombre } })
  if (Array.isArray(permisos)) {
    await prisma.rolPermiso.deleteMany({ where: { rolId: id } })
    const perms = await prisma.permiso.findMany({ where: { clave: { in: permisos } } })
    for (const p of perms) await prisma.rolPermiso.create({ data: { rolId: id, permisoId: p.id } })
  }
  return rol
}

async function listarPermisos() {
  return prisma.permiso.findMany({ orderBy: { clave: 'asc' } })
}

module.exports = { listarRoles, crearRol, actualizarRol, listarPermisos }
