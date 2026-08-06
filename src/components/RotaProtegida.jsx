import { Navigate } from 'react-router-dom';
import { getUsuarioLogado } from '../lib/auth.js'

export default function RotaProtegida({ children }) {
  const usuario = getUsuarioLogado()

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (usuario.status !== 'ativo') {
    localStorage.removeItem('usuarioLogado');
    return <Navigate to="/login" replace />;
  }

  return children;
}
