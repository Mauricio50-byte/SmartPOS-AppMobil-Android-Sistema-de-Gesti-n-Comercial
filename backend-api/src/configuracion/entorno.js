const PUERTO = process.env.PUERTO ? Number(process.env.PUERTO) : 3000
const JWT_SECRETO = process.env.JWT_SECRETO || 'secreto-super-seguro'

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lczrzowgimhtwvpsuagi.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_3-S_ut1yytVUIAXEk_MDEw_0li2yn63'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_Z50aFkamxasfvZgTt1v7RA_KDVu7iUf'

// DB Connection (Supabase Postgres)
// Format: postgres://[db-user]:[db-password]@aws-0-[region].pooler.supabase.com:6543/[db-name]?pgbouncer=true
// OR Direct: postgres://[db-user]:[db-password]@db.[project-ref].supabase.co:5432/[db-name]
// Assuming password provided 'SmartPOS AppMobil Android' needs URL encoding if it contains spaces.
// NOTE: Ideally user should provide the exact connection string. I will construct it based on provided info.
// Project ID: lczrzowgimhtwvpsuagi
const DB_PASSWORD_RAW = 'SmartPOS_AppMobil_Android'
const DB_PASSWORD = encodeURIComponent(DB_PASSWORD_RAW)
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:SmartPOS_AppMobil_Android@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true'

const ADMIN_CORREO = process.env.ADMIN_CORREO || 'admin@sistema-pos.local'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

module.exports = { 
  PUERTO, 
  JWT_SECRETO, 
  DATABASE_URL,
  ADMIN_CORREO, 
  ADMIN_PASSWORD,
  SUPABASE_URL,
  SUPABASE_KEY,
  SUPABASE_SERVICE_ROLE_KEY
}
