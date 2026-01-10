const { prisma } = require('../../infraestructura/bd')

async function listarClientes(filtro = {}) {
  return prisma.cliente.findMany({
    where: filtro,
    orderBy: { id: 'asc' },
    include: {
      _count: {
        select: { deudas: true, ventas: true }
      }
    }
  })
}

async function obtenerClientePorId(id, negocioId) {
  return prisma.cliente.findFirst({
    where: { id, negocioId },
    include: {
      deudas: {
        where: { estado: { in: ['PENDIENTE', 'VENCIDO'] } },
        include: { abonos: true }
      },
      ventas: {
        take: 10,
        orderBy: { fecha: 'desc' }
      }
    }
  })
}

async function obtenerEstadoCuentaCliente(id, negocioId) {
  const cliente = await prisma.cliente.findFirst({
    where: { id, negocioId },
    include: {
      deudas: {
        where: { estado: { in: ['PENDIENTE', 'VENCIDO'] } },
        include: {
          venta: true,
          abonos: {
            orderBy: { fecha: 'desc' }
          }
        },
        orderBy: { fechaCreacion: 'desc' }
      }
    }
  })

  if (!cliente) throw new Error('Cliente no encontrado')

  return {
    cliente: {
      id: cliente.id,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      creditoMaximo: cliente.creditoMaximo,
      saldoDeuda: cliente.saldoDeuda,
      puntos: cliente.puntos
    },
    deudas: cliente.deudas,
    creditoDisponible: cliente.creditoMaximo - cliente.saldoDeuda
  }
}

async function crearCliente(datos, negocioId) {
  const { nombre, correo, telefono, cedula, direccion, creditoMaximo = 0, diasCredito = 30 } = datos

  // Validar que no exista cliente con la misma cédula si se proporciona
  if (cedula) {
    const existe = await prisma.cliente.findFirst({ where: { cedula, negocioId } })
    if (existe) throw new Error('Ya existe un cliente con esta cédula en este negocio')
  }

  // Validar que no exista cliente con el mismo correo si se proporciona
  if (correo) {
    const existeCorreo = await prisma.cliente.findFirst({ where: { correo, negocioId } })
    if (existeCorreo) throw new Error('Ya existe un cliente con este correo en este negocio')
  }

  return prisma.cliente.create({
    data: {
      negocioId,
      nombre,
      correo: correo || null, // Convertir '' a null para evitar error de unique
      telefono,
      cedula: cedula || null, // Convertir '' a null para evitar error de unique
      direccion,
      creditoMaximo,
      diasCredito
    }
  })
}

async function actualizarCliente(id, datos, negocioId) {
  const existe = await prisma.cliente.findFirst({ where: { id, negocioId } })
  if (!existe) throw new Error('Cliente no encontrado')

  const campos = {}
  if (datos.nombre) campos.nombre = datos.nombre
  if (datos.correo !== undefined) campos.correo = datos.correo
  if (datos.telefono !== undefined) campos.telefono = datos.telefono
  if (datos.cedula !== undefined) campos.cedula = datos.cedula
  if (datos.direccion !== undefined) campos.direccion = datos.direccion
  if (typeof datos.activo === 'boolean') campos.activo = datos.activo
  if (typeof datos.creditoMaximo === 'number') campos.creditoMaximo = datos.creditoMaximo
  if (typeof datos.diasCredito === 'number') campos.diasCredito = datos.diasCredito
  if (typeof datos.saldoDeuda === 'number') campos.saldoDeuda = datos.saldoDeuda

  return prisma.cliente.update({ where: { id }, data: campos })
}

async function eliminarCliente(id, negocioId) {
  const existe = await prisma.cliente.findFirst({ where: { id, negocioId } })
  if (!existe) throw new Error('Cliente no encontrado')

  // Verificar que no tenga deudas pendientes
  const deudas = await prisma.deuda.count({
    where: {
      clienteId: id,
      estado: { in: ['PENDIENTE', 'VENCIDO'] }
    }
  })

  if (deudas > 0) {
    throw new Error('No se puede eliminar un cliente con deudas pendientes')
  }

  return prisma.cliente.delete({ where: { id } })
}

async function validarCreditoDisponible(clienteId, montoNuevo, negocioId) {
  const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, negocioId } })
  if (!cliente) throw new Error('Cliente no encontrado')

  const creditoDisponible = cliente.creditoMaximo - cliente.saldoDeuda

  return {
    disponible: creditoDisponible >= montoNuevo,
    creditoMaximo: cliente.creditoMaximo,
    saldoDeuda: cliente.saldoDeuda,
    creditoDisponible,
    montoSolicitado: montoNuevo
  }
}

module.exports = {
  listarClientes,
  obtenerClientePorId,
  obtenerEstadoCuentaCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  validarCreditoDisponible
}
