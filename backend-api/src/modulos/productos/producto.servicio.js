const { prisma } = require('../../infraestructura/bd')
const { obtenerPlugin } = require('./producto.factory')

const baseInclude = {
  detalleRopa: true,
  detalleAlimento: true,
  detalleServicio: true
}

async function listarProductos() {
  return prisma.producto.findMany({
    orderBy: { id: 'asc' },
    include: baseInclude
  })
}

async function obtenerProductoPorId(id) {
  return prisma.producto.findUnique({
    where: { id },
    include: baseInclude
  })
}

async function crearProducto(datos) {
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

async function actualizarProducto(id, datos) {
  const {
    nombre, sku, descripcion, imagen, categoria, subcategoria, marca,
    precioCosto, precioVenta, descuento, stock, stockMinimo, unidadMedida,
    iva, proveedor, activo, tipo,
    ...restoDatos
  } = datos

  return prisma.$transaction(async (tx) => {
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
        // No permitimos cambiar el tipo fácilmente por ahora, pero si se requiere:
        // tipo
      }
    })

    // 2. Actualizar detalles específicos
    // Usamos el tipo del producto actual o el nuevo si se envió
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

async function eliminarProducto(id) {
  // El borrado en cascada de la BD debería encargarse de los detalles
  // Pero si no, deberíamos borrar manualmente.
  // Con @relation(onDelete: Cascade) en Prisma schema, es automático.
  return prisma.producto.delete({ where: { id } })
}

module.exports = {
  listarProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto
}
