const { prisma } = require('../../../infraestructura/bd')

async function crearDetalle(tx, productoId, data) {
  const { fechaVencimiento, lote, registroSanitario, ingredientes, esPerecedero, temperaturaConservacion } = data
  
  // Convertir fecha si viene como string
  const fecha = fechaVencimiento ? new Date(fechaVencimiento) : null

  return tx.productoAlimento.create({
    data: {
      productoId,
      fechaVencimiento: fecha,
      lote,
      registroSanitario,
      ingredientes,
      esPerecedero: esPerecedero !== undefined ? esPerecedero : true,
      temperaturaConservacion
    }
  })
}

async function actualizarDetalle(tx, productoId, data) {
  const { fechaVencimiento, lote, registroSanitario, ingredientes, esPerecedero, temperaturaConservacion } = data
  const fecha = fechaVencimiento ? new Date(fechaVencimiento) : undefined

  const existente = await tx.productoAlimento.findUnique({ where: { productoId } })
  
  if (existente) {
    return tx.productoAlimento.update({
      where: { productoId },
      data: {
        fechaVencimiento: fecha,
        lote,
        registroSanitario,
        ingredientes,
        esPerecedero,
        temperaturaConservacion
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
