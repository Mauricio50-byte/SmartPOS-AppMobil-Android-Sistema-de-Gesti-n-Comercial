const { createClient } = require('@supabase/supabase-js')
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = require('../configuracion/entorno')

// Initialize Supabase Client with Service Role Key for backend access
// This allows the backend to bypass RLS policies if necessary, acting as an admin.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Check connection (optional simple query)
supabase.from('usuario').select('count', { count: 'exact', head: true })
  .then(({ error }) => {
    if (error) console.error('Error connecting to Supabase:', error.message)
    else console.log('Connected to Supabase successfully')
  })

module.exports = { supabase }
