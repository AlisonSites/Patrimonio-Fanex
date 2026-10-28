import { Link, Navigate } from 'react-router-dom'
import { modulosPermitidos, paginasPermitidas, useUsuario } from '../lib/permissoes.js'
import { FaArrowRight, FaLock } from 'react-icons/fa'

// "SUPORTE TÉCNICO" -> "Suporte"
function primeiroNome(nome) {
  const primeiro = (nome || '').trim().split(/\s+/)[0] || 'usuário'
  return primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase()
}

function saudacao() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

// Tela inicial: um card para cada módulo que o perfil do usuário pode acessar
export default function Inicio() {
  const usuario = useUsuario()
  const modulos = modulosPermitidos(usuario)

  // Com acesso a um único módulo, vai direto para ele
  if (modulos.length === 1) {
    return <Navigate to={paginasPermitidas(usuario, modulos[0])[0].path} replace />
  }

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="hub">
      <div className="hub-hero">
        <span className="hub-data">{hoje}</span>
        <h1>{saudacao()}, {primeiroNome(usuario?.nome)}!</h1>
        <p>O que você quer acessar hoje?</p>
      </div>

      {modulos.length === 0 ? (
        <div className="hub-card hub-card-vazio">
          <div className="hub-card-icon"><FaLock /></div>
          <h3>Sem acesso liberado</h3>
          <p>Seu perfil ainda não tem acesso a nenhum módulo. Peça ao administrador do sistema para liberar o acesso.</p>
        </div>
      ) : (
        <div className="hub-grid">
          {modulos.map((m) => {
            const paginas = paginasPermitidas(usuario, m)
            return (
              <Link key={m.key} to={paginas[0].path} className="hub-card">
                <div className="hub-card-topo">
                  <div className="hub-card-icon">{m.icon}</div>
                  <span className="hub-card-contagem">{paginas.length} {paginas.length === 1 ? 'página' : 'páginas'}</span>
                </div>
                <h3>{m.label}</h3>
                <p>{m.descricao}</p>
                <div className="hub-card-paginas">
                  {paginas.slice(0, 5).map((p) => <span key={p.chave}>{p.label}</span>)}
                  {paginas.length > 5 && <span>+{paginas.length - 5}</span>}
                </div>
                <div className="hub-card-acao">
                  Acessar módulo <span className="hub-card-seta"><FaArrowRight /></span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <div className="hub-rodape">© {new Date().getFullYear()} Fanex · Sistema de Gestão</div>
    </div>
  )
}
