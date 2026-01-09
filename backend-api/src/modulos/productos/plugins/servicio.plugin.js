const { prisma } = require('../../../infraestructura/bd')

async function crearDetalle(tx, productoId, data) {
  const { duracion, responsable, requiereCita, garantiaDias } = data
  
  return tx.productoServicio.create({
    data: {
      productoId,
      duracion: duracion ? Number(duracion) : null,
      responsable,
      requiereCita: requiereCita || false,
      garantiaDias: garantiaDias ? Number(garantiaDias) : null
    }
  })
}

async function actualizarDetalle(tx, productoId, data) {
  const { duracion, responsable, requiereCita, garantiaDias } = data
  
  const existente = await tx.productoServicio.findUnique({ where: { productoId } })
  
  if (existente) {
    return tx.productoServicio.update({
      where: { productoId },
      data: {
        duracion: duracion ? Number(duracion) : undefined,
        responsable,
        requiereCita,
        garantiaDias: garantiaDias ? Number(garantiaDias) : undefined
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
