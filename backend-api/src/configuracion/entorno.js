const dotenv = require('dotenv')
dotenv.config()

const PUERTO = process.env.PUERTO ? Number(process.env.PUERTO) : 3000
const JWT_SECRETO = process.env.JWT_SECRETO || 'secreto-super-seguro'

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lczrzowgimhtwvpsuagi.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_3-S_ut1yytVUIAXEk_MDEw_0li2yn63'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_Z50aFkamxasfvZgTt1v7RA_KDVu7iUf'

// DB Connection
const DATABASE_URL = process.env.DATABASE_URL
const DIRECT_URL = process.env.DIRECT_URL

// const ADMIN_CORREO = process.env.ADMIN_CORREO || 'admin@sistema-pos.local'
// const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

module.exports = { 
  PUERTO, 
  JWT_SECRETO, 
  DATABASE_URL,
  DIRECT_URL,
  // ADMIN_CORREO, 
  // ADMIN_PASSWORD,
  SUPABASE_URL,
  SUPABASE_KEY,
  SUPABASE_SERVICE_ROLE_KEY
}
