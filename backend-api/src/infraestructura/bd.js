const { Pool } = require('pg')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { DATABASE_URL } = require('../configuracion/entorno')

// Use connection pool for Serverless/Cloud DBs
const pool = new Pool({ connectionString: DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

module.exports = { prisma }
