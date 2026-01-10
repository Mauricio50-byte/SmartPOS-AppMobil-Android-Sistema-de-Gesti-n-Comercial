const { prisma } = require('../../infraestructura/bd')
const { obtenerPlugin } = require('./producto.factory')

const baseInclude = {
  detalleRopa: true,
  detalleAlimento: true,
  detalleServicio: true
}

async function listarProductos(negocioId) {
  return prisma.producto.findMany({
    where: { negocioId },
    orderBy: { id: 'asc' },
    include: baseInclude
  })
}

async function obtenerProductoPorId(id, negocioId) {
  return prisma.producto.findFirst({
    where: { id, negocioId },
    include: baseInclude
  })
}

async function crearProducto(datos, negocioId) {
  const {
    nombre, sku, descripcion, imagen, categoria, subcategoria, marca,
    precioCosto, precioVenta, descuento, stock, stockMinimo, unidadMedida,
    iva, proveedor, activo, tipo,
    ...restoDatos // Datos específicos del plugin
  } = datos

  return prisma.$transaction(async (tx) => {
    // 1. Crear el producto base
    const producto = await tx.producto.create({
      data: {
        negocioId, // Vincular al negocio
        nombre,
        sku,
        descripcion,
        imagen,
        categoria,
        subcategoria,
        marca,
        precioCosto,
        precioVenta,
        descuento,
        stock,
        stockMinimo,
        unidadMedida,
        iva,
        proveedor,
        activo: activo !== undefined ? activo : true,
        tipo: tipo || 'GENERAL'
      }
    })

    // 2. Delegar a la estrategia específica si existe
    const plugin = obtenerPlugin(tipo)
    if (plugin) {
      await plugin.crearDetalle(tx, producto.id, restoDatos)
    }

    // 3. Retornar el producto completo
    return tx.producto.findUnique({
      where: { id: producto.id },
      include: baseInclude
    })
  })
}

async function actualizarProducto(id, datos, negocioId) {
  const {
    nombre, sku, descripcion, imagen, categoria, subcategoria, marca,
    precioCosto, precioVenta, descuento, stock, stockMinimo, unidadMedida,
    iva, proveedor, activo, tipo,
    ...restoDatos
  } = datos

  return prisma.$transaction(async (tx) => {
    // Verificar propiedad
    const existe = await tx.producto.findFirst({ where: { id, negocioId } })
    if (!existe) throw new Error('Producto no encontrado o no pertenece al negocio')

    // 1. Actualizar datos base
    const producto = await tx.producto.update({
      where: { id },
      data: {
        nombre,
        sku,
        descripcion,
        imagen,
        categoria,
        subcategoria,
        marca,
        precioCosto,
        precioVenta,
        descuento,
        stock,
        stockMinimo,
        unidadMedida,
        iva,
        proveedor,
        activo,
        // No permitimos cambiar el tipo fácilmente por ahora
      }
    })

    // 2. Actualizar detalles específicos
    const tipoProducto = tipo || producto.tipo
    const plugin = obtenerPlugin(tipoProducto)
    
    if (plugin) {
      await plugin.actualizarDetalle(tx, producto.id, restoDatos)
    }

    return tx.producto.findUnique({
      where: { id: producto.id },
      include: baseInclude
    })
  })
}

async function eliminarProducto(id, negocioId) {
  const existe = await prisma.producto.findFirst({ where: { id, negocioId } })
  if (!existe) throw new Error('Producto no encontrado o no pertenece al negocio')

  return prisma.producto.delete({ where: { id } })
}

module.exports = {
  listarProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto
}
