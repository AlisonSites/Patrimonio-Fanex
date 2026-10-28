import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { atualizarPerfilLogado, getUsuarioLogado, logout } from '../lib/auth.js'
import { moduloPorPath, paginaPorPath } from '../lib/modulos.jsx'
import { paginasPermitidas } from '../lib/permissoes.js'
import logo from "../assets/logo-branco.png";
import { FaBars, FaPowerOff, FaThLarge } from 'react-icons/fa';

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [usuario, setUsuario] = useState(() => getUsuarioLogado())
  const location = useLocation()
  const navigate = useNavigate()

  // Recarrega as permissões do perfil ao entrar, para refletir mudanças do administrador
  useEffect(() => {
    atualizarPerfilLogado().then((u) => u && setUsuario(u))
  }, [])

  const modulo = moduloPorPath(location.pathname)
  const pagina = paginaPorPath(location.pathname)
  const title = pagina?.titulo || (modulo ? modulo.label : 'Sistema de Gestão')
  const subtitle = pagina?.subtitulo || (modulo ? '' : 'Patrimônio e Chromebooks')

  const navItems = modulo ? paginasPermitidas(usuario, modulo) : []

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const iniciais = (usuario?.nome || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <div className={`app-shell  ${modulo ? '' : 'app-shell-hub'}`}>
      {open && modulo && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      {modulo && (
        <aside className={`sidebar ${open ? 'open' : ''}`}>
          <div className="sidebar-brand">
            <div className="logo-mark">
              <img src={logo} alt="" />
            </div>
            <h1>{modulo.label}</h1>
            <span>Sistema de Gestão</span>
          </div>
          <nav className="sidebar-nav">
            <NavLink to="/" end className="sidebar-inicio" onClick={() => setOpen(false)}>
              <span className="icon"><FaThLarge size={18} /></span>
              Início
            </NavLink>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setOpen(false)}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            © {new Date().getFullYear()} Controle de Patrimônio
          </div>
        </aside>
      )}

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            {modulo ? (
              <button
                className="sidebar-toggle"
                onClick={() => setOpen((v) => !v)}
                title="Abrir menu"
                aria-label="Abrir menu"
              >
                <FaBars />
              </button>
            ) : (
              <div className="topbar-logo">
                <img src={logo} alt="" />
              </div>
            )}
            <div className="topbar-titles">
              <h2>{title}</h2>
              <div className="topbar-sub">{subtitle}</div>
            </div>
          </div>

          <div className="topbar-user">
            <div className="topbar-user-avatar">{iniciais}</div>
            <div className="topbar-user-info">
              <span className="topbar-user-nome">{usuario?.nome || 'Usuário'}</span>
              <span className="topbar-user-perfil">{usuario?.perfil_nome || 'Sem perfil'}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Sair">
              <FaPowerOff /> <span className="btn-texto-sair">Sair</span>
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet context={{ usuario }} />
        </main>
      </div>
    </div>
  )
}
