import { Navigate } from 'react-router-dom'
import { getUsuarioLogado } from '../lib/auth.js'

// Bloqueia o acesso à rota para quem não tem perfil de administrador.
// Deve ser usado sempre dentro de <RotaProtegida>, que já garante o login.
export default function RotaAdmin({ children }) {
  const usuario = getUsuarioLogado()

  if (!usuario?.perfil_is_admin) {
    return <Navigate to="/" replace />
  }

  return children
}
