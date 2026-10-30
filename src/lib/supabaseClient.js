import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY não encontradas. Verifique o arquivo .env'
  )
}

// Envia o id do usuário logado nas requisições ao banco, para que o log de
// auditoria saiba quem fez cada alteração (ver supabase_permissoes_auditoria.sql).
// Só nas chamadas à API REST — o Storage não precisa dessa informação.
function fetchComUsuario(input, init = {}) {
  const url = typeof input === 'string' ? input : input?.url || ''
  if (!url.includes('/rest/v1/')) return fetch(input, init)

  let usuarioId = null
  try {
    usuarioId = JSON.parse(localStorage.getItem('usuarioLogado') || 'null')?.id ?? null
  } catch {
    usuarioId = null
  }
  if (usuarioId == null) return fetch(input, init)

  const headers = new Headers(init.headers || (typeof input === 'string' ? undefined : input.headers))
  headers.set('x-usuario-id', String(usuarioId))
  return fetch(input, { ...init, headers })
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: fetchComUsuario },
})

// Nome do bucket de storage usado para anexar notas fiscais
export const NOTAS_FISCAIS_BUCKET = 'notas-fiscais'

// Nome do bucket de storage usado para a foto do patrimônio
export const FOTOS_PATRIMONIO_BUCKET = 'fotos-patrimonio'

// Nome do bucket de storage (público) usado para a foto do usuário
export const FOTOS_USUARIOS_BUCKET = 'fotos-usuarios'

// URL pública da foto do usuário (bucket público, não precisa de URL assinada)
export function fotoUsuarioUrl(path) {
  if (!path) return null
  return supabase.storage.from(FOTOS_USUARIOS_BUCKET).getPublicUrl(path).data.publicUrl
}
