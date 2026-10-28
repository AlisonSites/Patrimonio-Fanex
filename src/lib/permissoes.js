import { useLocation, useOutletContext } from 'react-router-dom'
import { MODULOS, paginaPorPath } from './modulos.jsx'

// Níveis de acesso por página: 'ver' (só consulta) ou 'editar' (incluir,
// alterar e excluir). Página sem nível = sem acesso. Administrador vê e edita tudo.
export const NIVEIS = [
  { value: '', label: 'Sem acesso' },
  { value: 'ver', label: 'Visualizar' },
  { value: 'editar', label: 'Editar' },
]

export function nivelAcesso(usuario, chave) {
  if (!usuario) return null
  if (usuario.perfil_is_admin) return 'editar'
  return usuario.perfil_permissoes?.[chave] || null
}

export function podeVer(usuario, chave) {
  return !!nivelAcesso(usuario, chave)
}

export function podeEditar(usuario, chave) {
  return nivelAcesso(usuario, chave) === 'editar'
}

export function paginasPermitidas(usuario, modulo) {
  return modulo.paginas.filter((p) => podeVer(usuario, p.chave))
}

export function modulosPermitidos(usuario) {
  return MODULOS.filter((m) => paginasPermitidas(usuario, m).length > 0)
}

// Hook usado nas telas para esconder os botões de incluir/editar/excluir
// quando o perfil só tem permissão de visualizar a página atual.
export function usePodeEditar() {
  const contexto = useOutletContext()
  const { pathname } = useLocation()
  const pagina = paginaPorPath(pathname)
  return pagina ? podeEditar(contexto?.usuario, pagina.chave) : false
}

// Usuário logado (com permissões já atualizadas pelo Layout)
export function useUsuario() {
  return useOutletContext()?.usuario || null
}
