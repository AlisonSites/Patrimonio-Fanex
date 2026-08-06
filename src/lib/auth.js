// Helper central para ler os dados do usuário logado (salvos no localStorage
// pelo Login). Mantém em um único lugar o parse + validação usados no
// RotaProtegida, no RotaAdmin e no Header.
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

export function logout() {
  localStorage.removeItem('usuarioLogado')
}
