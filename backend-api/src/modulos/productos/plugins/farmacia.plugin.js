const { prisma } = require('../../../infraestructura/bd')

async function crearDetalle(tx, productoId, data) {
  const { componenteActivo, presentacion, dosis, laboratorio, requiereReceta, fechaVencimiento, lote, registroInvima } = data
  
  const fecha = fechaVencimiento ? new Date(fechaVencimiento) : null

  return tx.productoFarmacia.create({
    data: {
      productoId,
      componenteActivo,
      presentacion,
      dosis,
      laboratorio,
      requiereReceta: requiereReceta || false,
      fechaVencimiento: fecha,
      lote,
      registroInvima
    }
  })
}

async function actualizarDetalle(tx, productoId, data) {
  const { componenteActivo, presentacion, dosis, laboratorio, requiereReceta, fechaVencimiento, lote, registroInvima } = data
  
  const fecha = fechaVencimiento ? new Date(fechaVencimiento) : undefined
  
  const existente = await tx.productoFarmacia.findUnique({ where: { productoId } })
  
  if (existente) {
    return tx.productoFarmacia.update({
      where: { productoId },
      data: {
        componenteActivo,
        presentacion,
        dosis,
        laboratorio,
        requiereReceta,
        fechaVencimiento: fecha,
        lote,
        registroInvima
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
