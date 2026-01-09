const { prisma } = require('../../infraestructura/bd')

const MODULOS_DISPONIBLES = [
  { id: 'dashboard', nombre: 'Dashboard', descripcion: 'Métricas y resúmenes generales', tipo: 'SISTEMA' },
  { id: 'ventas', nombre: 'Ventas', descripcion: 'Facturación e historial de ventas', tipo: 'SISTEMA' },
  { id: 'inventario', nombre: 'Productos (Inventario)', descripcion: 'Gestión de productos, stock y categorías', tipo: 'SISTEMA' },
  { id: 'clientes', nombre: 'Clientes', descripcion: 'Gestión de clientes y su historial', tipo: 'SISTEMA' },
  { id: 'finanzas', nombre: 'Finanzas', descripcion: 'Ingresos, gastos, caja y balances', tipo: 'SISTEMA' },
  { id: 'usuarios', nombre: 'Usuarios', descripcion: 'Administración de cuentas y roles', tipo: 'SISTEMA' },
  { id: 'modulos', nombre: 'Módulos', descripcion: 'Control de módulos del sistema', tipo: 'SISTEMA' },
  { id: 'reportes', nombre: 'Reportes', descripcion: 'Visualización y exportación de reportes', tipo: 'SISTEMA' },
  { id: 'configuracion', nombre: 'Configuración', descripcion: 'Datos del negocio y preferencias', tipo: 'SISTEMA' },
  // Plugins específicos de negocio (opcionales)
  { id: 'ropa', nombre: 'Tienda de Ropa', descripcion: 'Gestión de tallas, colores y colecciones', tipo: 'NEGOCIO' },
  { id: 'alimentos', nombre: 'Alimentos y Perecederos', descripcion: 'Control de vencimientos y lotes', tipo: 'NEGOCIO' },
  { id: 'servicios', nombre: 'Servicios Profesionales', descripcion: 'Citas, responsables y duración', tipo: 'NEGOCIO' },
  { id: 'farmacia', nombre: 'Farmacia y Droguería', descripcion: 'Control de medicamentos, laboratorios y recetas', tipo: 'NEGOCIO' },
  { id: 'papeleria', nombre: 'Papelería y Miscelánea', descripcion: 'Gestión de útiles, tipos de papel y dimensiones', tipo: 'NEGOCIO' },
  { id: 'restaurante', nombre: 'Restaurante y Bar', descripcion: 'Menú, ingredientes, preparación y dietas', tipo: 'NEGOCIO' }
]

async function inicializarModulos() {
  // Asegurar que los módulos base existan en la BD y tengan el tipo correcto
  for (const mod of MODULOS_DISPONIBLES) {
    await prisma.modulo.upsert({
      where: { id: mod.id },
      update: {
        nombre: mod.nombre,
        descripcion: mod.descripcion,
        tipo: mod.tipo,
        ...(mod.tipo === 'SISTEMA' ? { activo: true } : {})
      },
      create: {
        id: mod.id,
        nombre: mod.nombre,
        descripcion: mod.descripcion,
        tipo: mod.tipo,
        activo: mod.tipo === 'SISTEMA' // Módulos de sistema activos por defecto (para admin global)
      }
    })
  }
}

async function ensureNegocioModulos(negocioId) {
  if (!Number.isFinite(negocioId)) return
  const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { id: true } })
  if (!negocio) throw new Error('Negocio no encontrado')

  const modulos = await prisma.modulo.findMany({ select: { id: true } })
  if (!modulos.length) return

  await prisma.negocioModulo.createMany({
    data: modulos.map(m => ({ negocioId, moduloId: m.id, activo: false })),
    skipDuplicates: true
  })
}

async function listarCatalogoModulos() {
  await inicializarModulos()
  return prisma.modulo.findMany({ orderBy: { nombre: 'asc' } })
}

async function listarModulos(negocioId) {
  await inicializarModulos()
  const negocioIdNum = Number(negocioId)
  if (!Number.isFinite(negocioIdNum)) {
    return prisma.modulo.findMany({ orderBy: { nombre: 'asc' } })
  }

  await ensureNegocioModulos(negocioIdNum)

  const filas = await prisma.negocioModulo.findMany({
    where: { negocioId: negocioIdNum },
    include: { modulo: true },
    orderBy: { moduloId: 'asc' }
  })

  return filas
    .map(f => ({
      ...f.modulo,
      activo: f.activo
    }))
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)))
}

async function toggleModulo(negocioId, id, activo) {
  await inicializarModulos()
  const negocioIdNum = Number(negocioId)
  if (!Number.isFinite(negocioIdNum)) {
    return prisma.modulo.update({
      where: { id },
      data: { activo: Boolean(activo) }
    })
  }

  await ensureNegocioModulos(negocioIdNum)
  const actualizado = await prisma.negocioModulo.update({
    where: { negocioId_moduloId: { negocioId: negocioIdNum, moduloId: id } },
    data: { activo: Boolean(activo) }
  })

  const modulo = await prisma.modulo.findUnique({ where: { id } })
  if (!modulo) throw new Error('Módulo no encontrado')
  return { ...modulo, activo: actualizado.activo }
}

async function actualizarConfig(id, config) {
  return prisma.modulo.update({
    where: { id },
    data: { config }
  })
}

module.exports = {
  listarCatalogoModulos,
  listarModulos,
  toggleModulo,
  actualizarConfig
}
