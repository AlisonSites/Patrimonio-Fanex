import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RotaProtegida from './components/RotaProtegida.jsx'
import RotaPermissao from './components/RotaPermissao.jsx'
import Inicio from './pages/Inicio.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Patrimonio from './pages/Patrimonio.jsx'
import Conservacao from './pages/Conservacao.jsx'
import Quebrado from './pages/Quebrado.jsx'
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
import MeuPerfil from './pages/MeuPerfil.jsx'
import DashboardChromebook from './pages/chromebook/DashboardChromebook.jsx'
import Chromebooks from './pages/chromebook/Chromebooks.jsx'
import Emprestimos from './pages/chromebook/Emprestimos.jsx'
import Manutencoes from './pages/chromebook/Manutencoes.jsx'
import Alunos from './pages/chromebook/Alunos.jsx'
import Turmas from './pages/chromebook/Turmas.jsx'
import RelatoriosChromebook from './pages/chromebook/RelatoriosChromebook.jsx'
import VisaoGeral from './pages/admin/VisaoGeral.jsx'
import Auditoria from './pages/admin/Auditoria.jsx'

// Atalho: rota protegida pela permissão (chave) definida em lib/modulos.jsx
function p(chave, elemento) {
  return <RotaPermissao chave={chave}>{elemento}</RotaPermissao>
}

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
        <Route path="/" element={<Inicio />} />
        <Route path="/meu-perfil" element={<MeuPerfil />} />

        {/* Módulo Patrimônio */}
        <Route path="/patrimonio" element={p('patrimonio.dashboard', <Dashboard />)} />
        <Route path="/patrimonio/bens" element={p('patrimonio.bens', <Patrimonio />)} />
        <Route path="/patrimonio/conservacao" element={p('patrimonio.conservacao', <Conservacao />)} />
        <Route path="/patrimonio/quebrados" element={p('patrimonio.quebrados', <Quebrado />)} />
        <Route path="/patrimonio/movimentacao" element={p('patrimonio.movimentacao', <Movimentacao />)} />
        <Route path="/patrimonio/tipos" element={p('patrimonio.tipos', <Tipo />)} />
        <Route path="/patrimonio/setores" element={p('patrimonio.setores', <Setor />)} />
        <Route path="/patrimonio/responsaveis" element={p('patrimonio.responsaveis', <Responsavel />)} />
        <Route path="/patrimonio/fornecedores" element={p('patrimonio.fornecedores', <Fornecedor />)} />
        <Route path="/patrimonio/relatorios" element={p('patrimonio.relatorios', <Relatorios />)} />

        {/* Módulo Chromebook */}
        <Route path="/chromebook" element={p('chromebook.dashboard', <DashboardChromebook />)} />
        <Route path="/chromebook/do-aluno" element={p('chromebook.alunos_cb', <Chromebooks key="aluno" propriedade="aluno" />)} />
        <Route path="/chromebook/da-escola" element={p('chromebook.escola_cb', <Chromebooks key="escola" propriedade="escola" />)} />
        <Route path="/chromebook/emprestimos" element={p('chromebook.emprestimos', <Emprestimos />)} />
        <Route path="/chromebook/manutencoes" element={p('chromebook.manutencoes', <Manutencoes />)} />
        <Route path="/chromebook/alunos" element={p('chromebook.alunos', <Alunos />)} />
        <Route path="/chromebook/turmas" element={p('chromebook.turmas', <Turmas />)} />
        <Route path="/chromebook/relatorios" element={p('chromebook.relatorios', <RelatoriosChromebook />)} />

        {/* Administração */}
        <Route path="/admin" element={p('admin.visao_geral', <VisaoGeral />)} />
        <Route path="/admin/usuarios" element={p('admin.usuarios', <Usuario />)} />
        <Route path="/admin/perfis" element={p('admin.perfis', <Perfil />)} />
        <Route path="/admin/unidades" element={p('admin.unidades', <Unidade />)} />
        <Route path="/admin/auditoria" element={p('admin.auditoria', <Auditoria />)} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
