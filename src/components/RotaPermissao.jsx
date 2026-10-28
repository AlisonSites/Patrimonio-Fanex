import { Navigate } from 'react-router-dom'
import { paginaPorChave, MODULOS } from '../lib/modulos.jsx'
import { paginasPermitidas, podeVer, useUsuario } from '../lib/permissoes.js'

// Bloqueia a página para quem não tem permissão de visualizá-la no perfil.
// Se o usuário tiver acesso a outra página do mesmo módulo, vai para ela;
// senão, volta para a tela inicial. Deve ficar dentro do <Layout>.
export default function RotaPermissao({ chave, children }) {
  const usuario = useUsuario()

  if (podeVer(usuario, chave)) return children

  const pagina = paginaPorChave(chave)
  const modulo = MODULOS.find((m) => m.key === pagina?.modulo)
  const alternativa = modulo ? paginasPermitidas(usuario, modulo)[0] : null

  return <Navigate to={alternativa ? alternativa.path : '/'} replace />
}
