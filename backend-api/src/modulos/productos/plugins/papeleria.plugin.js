const { prisma } = require('../../../infraestructura/bd')

async function crearDetalle(tx, productoId, data) {
  const { tipoPapel, gramaje, dimensiones, material, esKit } = data
  
  return tx.productoPapeleria.create({
    data: {
      productoId,
      tipoPapel,
      gramaje,
      dimensiones,
      material,
      esKit: esKit || false
    }
  })
}

async function actualizarDetalle(tx, productoId, data) {
  const { tipoPapel, gramaje, dimensiones, material, esKit } = data
  
  const existente = await tx.productoPapeleria.findUnique({ where: { productoId } })
  
  if (existente) {
    return tx.productoPapeleria.update({
      where: { productoId },
      data: {
        tipoPapel,
        gramaje,
        dimensiones,
        material,
        esKit
      }
    })
  } else {
    return crearDetalle(tx, productoId, data)
  }
}

module.exports = {
  crearDetalle,
  actualizarDetalle
}
