const { prisma } = require('../../infraestructura/bd')
const { crearDeuda } = require('../deudas/deuda.servicio')

async function listarVentas(filtro = {}) {
  return prisma.venta.findMany({
    where: filtro,
    orderBy: { id: 'desc' },
    include: {
      detalles: {
        include: { producto: true }
      },
      cliente: true,
      usuario: {
        select: { id: true, nombre: true }
      }
    }
  })
}

async function obtenerVentaPorId(id, negocioId) {
  return prisma.venta.findFirst({
    where: { id, negocioId },
    include: {
      detalles: {
        include: { producto: true }
      },
      cliente: true,
      usuario: {
        select: { id: true, nombre: true }
      },
      deuda: {
        include: {
          abonos: true
        }
      }
    }
  })
}

async function crearVenta(payload) {
  console.log('--- INICIO CREAR VENTA ---');
  console.log('Payload recibido:', JSON.stringify(payload, null, 2));

  const {
    clienteId = null,
    items = [],
    usuarioId,
    metodoPago = 'EFECTIVO',
    estadoPago = 'PAGADO',
    montoPagado = 0,
    registrarCliente = false,
    datosCliente = null,
    negocioId
  } = payload

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Sin items')
  }

  const ventaId = await prisma.$transaction(async tx => {
    let clienteIdFinal = clienteId

    // Si se solicita registrar un nuevo cliente
    if (registrarCliente && datosCliente) {
      const nuevoCliente = await tx.cliente.create({
        data: {
          negocioId,
          nombre: datosCliente.nombre,
          telefono: datosCliente.telefono,
          cedula: datosCliente.cedula || null, // Convertir '' a null
          correo: datosCliente.correo || null, // Convertir '' a null
          direccion: datosCliente.direccion,
          creditoMaximo: datosCliente.creditoMaximo || 0,
          diasCredito: datosCliente.diasCredito || 30
        }
      })
      clienteIdFinal = nuevoCliente.id
    }

    // Validar crédito disponible si es venta fiada
    if (estadoPago === 'FIADO' && clienteIdFinal) {
      const cliente = await tx.cliente.findFirst({ where: { id: clienteIdFinal, negocioId } })
      if (!cliente) throw new Error('Cliente no encontrado')

      // Calcular total primero
      const productosIds = items.map(i => Number(i.productoId));
      const productos = await tx.producto.findMany({
        where: { id: { in: productosIds }, negocioId }
      })
      const mapa = new Map(productos.map(p => [p.id, p]))
      let totalCalculado = 0

      items.forEach(i => {
        const p = mapa.get(Number(i.productoId))
        if (p) {
          // Usar precioVenta en lugar de precio
          const precio = Number(p.precioVenta || p.precio || 0);
          totalCalculado += Number(i.cantidad) * precio
        }
      })

      const creditoDisponible = (cliente.creditoMaximo || 0) - (cliente.saldoDeuda || 0)
      if (creditoDisponible < totalCalculado) {
        throw new Error(`Crédito insuficiente. Disponible: $${creditoDisponible}, Solicitado: $${totalCalculado}`)
      }
    }

    // Obtener productos y validar stock
    const productos = await tx.producto.findMany({
      where: { id: { in: items.map(i => Number(i.productoId)) }, negocioId }
    })
    console.log('Productos recuperados BD:', JSON.stringify(productos, null, 2));

    const mapa = new Map(productos.map(p => [p.id, p]))

    let total = 0
    const detalles = items.map(i => {
      console.log('Procesando item:', i);
      const p = mapa.get(Number(i.productoId))
      if (!p) throw new Error(`Producto con ID ${i.productoId} no existe o no pertenece al negocio`)
      
      console.log('Producto encontrado:', p);

      const cantidad = Number(i.cantidad)
      let precioRaw = p.precioVenta;
      if (precioRaw === null || precioRaw === undefined) {
          precioRaw = p.precio; // Fallback por si acaso
      }
      
      const precioUnitario = Number(precioRaw || 0);
      
      if (isNaN(precioUnitario)) {
         console.error(`Error de precio en producto ${p.id}:`, p);
         throw new Error(`Precio inválido para producto ${p.nombre} (ID: ${p.id})`);
      }
      
      const subtotal = cantidad * precioUnitario
      console.log(`Subtotal calculado para ${p.id}: ${subtotal}`);
      
      total += subtotal
      return { productoId: p.id, cantidad, precioUnitario, subtotal }
    })
    
    console.log('Total calculado:', total);

    // Calcular saldo pendiente
    const montoPagadoFinal = estadoPago === 'PAGADO' ? total : Number(montoPagado || 0)
    const saldoPendiente = total - montoPagadoFinal

    const totalFinal = Number(total || 0);
    const montoPagadoValidado = Number(montoPagadoFinal || 0);
    const saldoPendienteValidado = Number(saldoPendiente || 0);

    const ventaData = {
      negocioId,
      total: totalFinal,
      metodoPago,
      estadoPago,
      montoPagado: montoPagadoValidado,
      saldoPendiente: saldoPendienteValidado,
      usuarioId: Number(usuarioId), // Pasar directo el ID
      clienteId: clienteIdFinal ? Number(clienteIdFinal) : null // Pasar directo el ID o null
    }
    
    console.log('Data final para Prisma (Simple IDs):', JSON.stringify(ventaData, null, 2));

    // Crear la venta
    const venta = await tx.venta.create({
      data: ventaData
    })

    // Crear detalles y actualizar stock
    for (const d of detalles) {
      await tx.detalleVenta.create({
        data: {
          negocioId,
          ventaId: venta.id,
          productoId: d.productoId,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          subtotal: d.subtotal
        }
      })
      await tx.producto.update({
        where: { id: d.productoId },
        data: { stock: { decrement: d.cantidad } }
      })
    }

    // Si es venta fiada, crear la deuda
    if (estadoPago === 'FIADO' && clienteIdFinal) {
      // Calcular fecha de vencimiento
      const clienteDeuda = await tx.cliente.findFirst({ where: { id: clienteIdFinal, negocioId } })
      const dias = clienteDeuda.diasCredito || 30
      const fechaVencimiento = new Date()
      fechaVencimiento.setDate(fechaVencimiento.getDate() + dias)

      await tx.deuda.create({
        data: {
          negocioId,
          clienteId: clienteIdFinal,
          ventaId: venta.id,
          montoTotal: saldoPendiente,
          saldoPendiente: saldoPendiente,
          fechaVencimiento
        }
      })

      // Actualizar saldo de deuda del cliente
      await tx.cliente.update({
        where: { id: clienteIdFinal },
        data: {
          saldoDeuda: { increment: saldoPendiente }
        }
      })
    }

    // Agregar puntos al cliente si aplica (1 punto por cada $1000)
    if (clienteIdFinal && estadoPago === 'PAGADO') {
      const puntosGanados = Math.floor(total / 1000)
      if (puntosGanados > 0) {
        await tx.cliente.update({
          where: { id: clienteIdFinal },
          data: {
            puntos: { increment: puntosGanados }
          }
        })
      }
    }

    // --- INTEGRACIÓN CAJA ---
    console.log(`[Caja Integration] Iniciando verificación. UsuarioId: ${usuarioId}, MontoPagado: ${montoPagadoValidado}`);
    
    // Registrar cualquier venta en la caja abierta del usuario, independientemente del método de pago
    if (montoPagadoValidado > 0) {
      const cajaAbierta = await tx.caja.findFirst({
        where: { usuarioId: Number(usuarioId), negocioId, estado: 'ABIERTA' }
      })

      console.log(`[Caja Integration] Caja abierta encontrada:`, cajaAbierta ? cajaAbierta.id : 'NO');

      if (cajaAbierta) {
        const metodoPagoNorm = String(metodoPago).toUpperCase(); // Normalizar a mayúsculas (EFECTIVO, TRANSFERENCIA)
        const mov = await tx.movimientoCaja.create({
          data: {
            negocioId,
            cajaId: cajaAbierta.id,
            usuarioId: Number(usuarioId),
            tipo: 'VENTA',
            metodoPago: metodoPagoNorm,
            monto: montoPagadoValidado,
            descripcion: `Venta #${venta.id} (${metodoPagoNorm})`,
            ventaId: venta.id,
            fecha: new Date()
          }
        })
        console.log(`[Caja Integration] Movimiento creado:`, mov.id);
      } else {
        console.warn(`[Caja Integration] ADVERTENCIA: Se realizó una venta pero el usuario ${usuarioId} no tiene caja abierta.`);
      }
    } else {
        console.log(`[Caja Integration] Omitido: Monto pagado es 0 o menor.`);
    }
    // ------------------------

    // Retornar solo el ID de la venta creada para salir de la transacción
    return venta.id
  })

  // Una vez confirmada la transacción, obtener la venta completa
  console.log(`Transacción completada. Recuperando venta ID: ${ventaId}`);
  const ventaCompleta = await obtenerVentaPorId(ventaId, negocioId);
  
  if (!ventaCompleta) {
    console.error(`ERROR CRÍTICO: No se pudo recuperar la venta ${ventaId} después de la transacción.`);
    // Intentar recuperación de emergencia o devolver objeto básico
    throw new Error('Venta creada pero no se pudo recuperar la información completa.');
  }

  return ventaCompleta;
}

module.exports = { listarVentas, obtenerVentaPorId, crearVenta }
