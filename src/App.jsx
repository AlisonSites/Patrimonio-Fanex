import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RotaProtegida from './components/RotaProtegida.jsx'
import RotaAdmin from './components/RotaAdmin.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Patrimonio from './pages/Patrimonio.jsx'
import Conservacao from './pages/Conservacao.jsx'
import Movimentacao from './pages/Movimentacao.jsx'
import Tipo from './pages/Tipo.jsx'
import Unidade from './pages/Unidade.jsx'
import Setor from './pages/Setor.jsx'
import Responsavel from './pages/Responsavel.jsx'
import Fornecedor from './pages/Fornecedor.jsx'
import Relatorios from './pages/Relatorios.jsx'
import Login from './pages/Login.jsx'
import Usuario from './pages/Usuario.jsx'
import Perfil from './pages/Perfil.jsx'

export default function App() {
  return (
    <Routes>
      {/* Rota pública, sem o menu/sidebar */}
      <Route path="/login" element={<Login />} />

      {/* Rotas internas: exigem login e ficam dentro do Layout */}
      <Route
        element={
          <RotaProtegida>
            <Layout />
          </RotaProtegida>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/patrimonio" element={<Patrimonio />} />
        <Route path="/conservacao" element={<Conservacao />} />
        <Route path="/movimentacao" element={<Movimentacao />} />
        <Route path="/tipos" element={<Tipo />} />
        <Route path="/unidades" element={<Unidade />} />
        <Route path="/setores" element={<Setor />} />
        <Route path="/responsaveis" element={<Responsavel />} />
        <Route path="/fornecedores" element={<Fornecedor />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/usuarios" element={<RotaAdmin><Usuario /></RotaAdmin>} />
        <Route path="/perfis" element={<RotaAdmin><Perfil /></RotaAdmin>} />
      </Route>
    </Routes>
  )
}
