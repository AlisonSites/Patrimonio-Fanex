import { supabase } from './supabaseClient.js'

// Helper central para ler os dados do usuário logado (salvos no localStorage
// pelo Login). Mantém em um único lugar o parse + validação usados no
// RotaProtegida, no Layout e nas permissões.
export function getUsuarioLogado() {
  const salvo = localStorage.getItem('usuarioLogado')
  if (!salvo) return null

  try {
    return JSON.parse(salvo)
  } catch {
    localStorage.removeItem('usuarioLogado')
    return null
  }
}

export function salvarUsuarioLogado(usuario) {
  localStorage.setItem('usuarioLogado', JSON.stringify(usuario))
}

export function logout() {
  localStorage.removeItem('usuarioLogado')
}

// Busca o perfil de acesso (nome, admin e permissões) de um usuário
export async function carregarPerfil(perfilId) {
  const vazio = { perfil_nome: null, perfil_is_admin: false, perfil_permissoes: {} }
  if (!perfilId) return vazio

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome, is_admin, permissoes, status')
    .eq('id', perfilId)
    .maybeSingle()
  if (!perfil || perfil.status !== 'ativo') return vazio

  return {
    perfil_nome: perfil.nome,
    perfil_is_admin: !!perfil.is_admin,
    perfil_permissoes: perfil.permissoes || {},
  }
}

// Recarrega o perfil do usuário logado, para que mudanças feitas pelo
// administrador valham sem precisar sair e entrar de novo.
export async function atualizarPerfilLogado() {
  const usuario = getUsuarioLogado()
  if (!usuario) return null
  const atualizado = { ...usuario, ...(await carregarPerfil(usuario.perfil_id)) }
  salvarUsuarioLogado(atualizado)
  return atualizado
}
