import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY não encontradas. Verifique o arquivo .env'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Nome do bucket de storage usado para anexar notas fiscais
export const NOTAS_FISCAIS_BUCKET = 'notas-fiscais'
