const { prisma } = require('../../../infraestructura/bd')

async function crearDetalle(tx, productoId, data) {
  const { ingredientes, tiempoPreparacion, esVegano, esVegetariano, tieneAlcohol, calorias } = data
  
  return tx.productoRestaurante.create({
    data: {
      productoId,
      ingredientes,
      tiempoPreparacion: tiempoPreparacion ? Number(tiempoPreparacion) : null,
      esVegano: esVegano || false,
      esVegetariano: esVegetariano || false,
      tieneAlcohol: tieneAlcohol || false,
      calorias: calorias ? Number(calorias) : null
    }
  })
}

async function actualizarDetalle(tx, productoId, data) {
  const { ingredientes, tiempoPreparacion, esVegano, esVegetariano, tieneAlcohol, calorias } = data
  
  const existente = await tx.productoRestaurante.findUnique({ where: { productoId } })
  
  if (existente) {
    return tx.productoRestaurante.update({
      where: { productoId },
      data: {
        ingredientes,
        tiempoPreparacion: tiempoPreparacion ? Number(tiempoPreparacion) : null,
        esVegano,
        esVegetariano,
        tieneAlcohol,
        calorias: calorias ? Number(calorias) : null
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
