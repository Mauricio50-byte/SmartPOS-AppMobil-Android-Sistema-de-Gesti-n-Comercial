const PUERTO = process.env.PUERTO ? Number(process.env.PUERTO) : 3000
const JWT_SECRETO = process.env.JWT_SECRETO || 'secreto-super-seguro'
const DB_USER = process.env.DB_USER || 'postgres'
const DB_PASSWORD = process.env.DB_PASSWORD || 'root'
const DB_HOST = process.env.DB_HOST || (process.env.DOCKER === 'true' ? 'sistema-pos' : 'localhost')
const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432
const DB_NAME = process.env.DB_NAME || 'sistema_pos'
const DATABASE_URL = process.env.DATABASE_URL || `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public`
const ADMIN_CORREO = process.env.ADMIN_CORREO || 'admin@sistema-pos.local'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
module.exports = { PUERTO, JWT_SECRETO, DATABASE_URL, ADMIN_CORREO, ADMIN_PASSWORD }
