const { prisma } = require('../../../infraestructura/bd')

async function crearDetalle(tx, productoId, data) {
  // Extraer solo los campos relevantes para Ropa
  const { talla, color, material, genero, temporada } = data
  
  if (!talla && !color && !material && !genero && !temporada) return null

  return tx.productoRopa.create({
    data: {
      productoId,
      talla,
      color,
      material,
      genero,
      temporada
    }
  })
}

async function actualizarDetalle(tx, productoId, data) {
  const { talla, color, material, genero, temporada } = data
  
  // Verificar si existe el detalle
  const existente = await tx.productoRopa.findUnique({ where: { productoId } })
  
  if (existente) {
    return tx.productoRopa.update({
      where: { productoId },
      data: { talla, color, material, genero, temporada }
    })
  } else {
    // Si no existe pero hay datos, crearlo
    if (talla || color || material || genero || temporada) {
      return crearDetalle(tx, productoId, data)
    }
  }
  return null
}

module.exports = {
  crearDetalle,
  actualizarDetalle
}
