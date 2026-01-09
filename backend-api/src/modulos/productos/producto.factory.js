const ropaPlugin = require('./plugins/ropa.plugin')
const alimentoPlugin = require('./plugins/alimento.plugin')
const servicioPlugin = require('./plugins/servicio.plugin')
const farmaciaPlugin = require('./plugins/farmacia.plugin')
const papeleriaPlugin = require('./plugins/papeleria.plugin')
const restaurantePlugin = require('./plugins/restaurante.plugin')

const plugins = {
  'ROPA': ropaPlugin,
  'ALIMENTO': alimentoPlugin,
  'SERVICIO': servicioPlugin,
  'FARMACIA': farmaciaPlugin,
  'PAPELERIA': papeleriaPlugin,
  'RESTAURANTE': restaurantePlugin
}

function obtenerPlugin(tipo) {
  return plugins[tipo?.toUpperCase()] || null
}

module.exports = { obtenerPlugin }
