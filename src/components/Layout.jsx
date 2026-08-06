import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getUsuarioLogado, logout } from '../lib/auth.js'
import Logo from '../assets/Logo-branco.png';
import { 
  FaTachometerAlt, 
  FaBoxes, 
  FaTags, 
  FaBuilding, 
  FaUsers, 
  FaUserCog, 
  FaTruck, 
  FaChartBar,
  FaUser,
  FaUserShield
} from 'react-icons/fa';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: <FaTachometerAlt size={20} />, end: true },
  { to: '/patrimonio', label: 'Patrimônio', icon: <FaBoxes size={20} /> },
  { to: '/tipos', label: 'Tipos', icon: <FaTags size={20} /> },
  { to: '/unidades', label: 'Unidades', icon: <FaBuilding size={20} /> },
  { to: '/setores', label: 'Setores', icon: <FaUsers size={20} /> },
  { to: '/responsaveis', label: 'Responsáveis', icon: <FaUserCog size={20} /> },
  { to: '/fornecedores', label: 'Fornecedores', icon: <FaTruck size={20} /> },
  { to: '/relatorios', label: 'Relatórios', icon: <FaChartBar size={20} /> },
  { to: '/usuarios', label: 'Usuários', icon: <FaUser size={20} />, adminOnly: true },
  { to: '/perfis', label: 'Perfis de Acesso', icon: <FaUserShield size={20} />, adminOnly: true },
]

const TITLES = {
  '/': ['Dashboard', 'Visão geral do patrimônio escolar'],
  '/patrimonio': ['Cadastro de Patrimônio', 'Gerencie todos os bens da instituição'],
  '/tipos': ['Cadastro de Tipo', 'Categorias de patrimônio'],
  '/unidades': ['Cadastro de Unidade', 'Unidades escolares'],
  '/setores': ['Cadastro de Setor', 'Setores vinculados às unidades'],
  '/responsaveis': ['Cadastro de Responsável', 'Pessoas responsáveis pelos bens'],
  '/fornecedores': ['Cadastro de Fornecedor', 'Fornecedores de patrimônio'],
  '/relatorios': ['Relatórios', 'Exporte dados em CSV ou PDF'],
  '/usuarios': ['Cadastro de Usuários', 'Contas com acesso ao sistema'],
  '/perfis': ['Cadastro de Perfis de Acesso', 'Perfis e permissões do sistema'],
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const [title, subtitle] = TITLES[location.pathname] || ['Sistema', '']
  const usuario = useMemo(() => getUsuarioLogado(), [location.pathname])

  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || usuario?.perfil_is_admin)

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
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-mark">
            <img src={Logo} alt="" />
          </div>
          <h1>Patrimônio Escolar</h1>
          <span>Sistema de Gestão</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
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

      <div className="main-area">
        <header className="topbar">
          <div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ display: 'none' }}
              onClick={() => setOpen((v) => !v)}
            >
              ☰
            </button>
            <h2>{title}</h2>
            <div className="topbar-sub">{subtitle}</div>
          </div>

          <div className="topbar-user">
            <div className="topbar-user-avatar">{iniciais}</div>
            <div className="topbar-user-info">
              <span className="topbar-user-nome">{usuario?.nome || 'Usuário'}</span>
              <span className="topbar-user-perfil">{usuario?.perfil_nome || 'Sem perfil'}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Sair">
              ⏻ Sair
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
