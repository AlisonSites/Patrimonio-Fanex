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
  FaUserShield,
  FaHeartbeat,
  FaExchangeAlt,
  FaExclamationTriangle,
  FaLaptop,
  FaSchool,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaHandHolding,
  FaTools,
  FaHistory,
  FaChartPie,
  FaCogs,
} from 'react-icons/fa'

/**
 * Catálogo central de módulos e páginas do sistema.
 * Cada página tem uma "chave" que é usada nas permissões do perfil de acesso
 * (ver lib/permissoes.js). Menu lateral, títulos do topo, cards da tela
 * inicial e a tela de perfis são gerados a partir daqui.
 *
 * somenteVer: a página não tem ações de edição (ex: dashboards e relatórios).
 */
export const MODULOS = [
  {
    key: 'patrimonio',
    label: 'Patrimônio',
    descricao: 'Bens da instituição, conservação, quebras, movimentações e relatórios.',
    icon: <FaBoxes />,
    base: '/patrimonio',
    paginas: [
      { chave: 'patrimonio.dashboard', path: '/patrimonio', label: 'Dashboard', icon: <FaTachometerAlt />, titulo: 'Dashboard do Patrimônio', subtitulo: 'Visão geral do patrimônio escolar', somenteVer: true },
      { chave: 'patrimonio.bens', path: '/patrimonio/bens', label: 'Patrimônio', icon: <FaBoxes />, titulo: 'Cadastro de Patrimônio', subtitulo: 'Gerencie todos os bens da instituição' },
      { chave: 'patrimonio.conservacao', path: '/patrimonio/conservacao', label: 'Conservação de Bem', icon: <FaHeartbeat />, titulo: 'Conservação de Bem', subtitulo: 'Histórico de valores e estado de conservação dos bens' },
      { chave: 'patrimonio.quebrados', path: '/patrimonio/quebrados', label: 'Patrimônios Quebrados', icon: <FaExclamationTriangle />, titulo: 'Patrimônios Quebrados', subtitulo: 'Registre a quebra de um bem — ele é inativado automaticamente' },
      { chave: 'patrimonio.movimentacao', path: '/patrimonio/movimentacao', label: 'Movimentação', icon: <FaExchangeAlt />, titulo: 'Movimentação de Patrimônio', subtitulo: 'Registre trocas de unidade e setor dos bens' },
      { chave: 'patrimonio.tipos', path: '/patrimonio/tipos', label: 'Tipos', icon: <FaTags />, titulo: 'Cadastro de Tipo', subtitulo: 'Categorias de patrimônio' },
      { chave: 'patrimonio.setores', path: '/patrimonio/setores', label: 'Setores', icon: <FaUsers />, titulo: 'Cadastro de Setor', subtitulo: 'Setores vinculados às unidades' },
      { chave: 'patrimonio.responsaveis', path: '/patrimonio/responsaveis', label: 'Responsáveis', icon: <FaUserCog />, titulo: 'Cadastro de Responsável', subtitulo: 'Pessoas responsáveis pelos bens' },
      { chave: 'patrimonio.fornecedores', path: '/patrimonio/fornecedores', label: 'Fornecedores', icon: <FaTruck />, titulo: 'Cadastro de Fornecedor', subtitulo: 'Fornecedores de patrimônio' },
      { chave: 'patrimonio.relatorios', path: '/patrimonio/relatorios', label: 'Relatórios', icon: <FaChartBar />, titulo: 'Relatórios do Patrimônio', subtitulo: 'Exporte dados em CSV ou PDF', somenteVer: true },
    ],
  },
  {
    key: 'chromebook',
    label: 'Chromebooks',
    descricao: 'Chromebooks dos alunos e da escola, empréstimos, manutenções e turmas.',
    icon: <FaLaptop />,
    base: '/chromebook',
    paginas: [
      { chave: 'chromebook.dashboard', path: '/chromebook', label: 'Dashboard', icon: <FaTachometerAlt />, titulo: 'Dashboard dos Chromebooks', subtitulo: 'Situação dos aparelhos, empréstimos e manutenções', somenteVer: true },
      { chave: 'chromebook.alunos_cb', path: '/chromebook/do-aluno', label: 'Chromebooks dos Alunos', icon: <FaLaptop />, titulo: 'Chromebooks dos Alunos', subtitulo: 'Aparelhos que pertencem a cada aluno' },
      { chave: 'chromebook.escola_cb', path: '/chromebook/da-escola', label: 'Chromebooks da Escola', icon: <FaSchool />, titulo: 'Chromebooks da Escola', subtitulo: 'Aparelhos da escola disponíveis para empréstimo' },
      { chave: 'chromebook.emprestimos', path: '/chromebook/emprestimos', label: 'Empréstimos', icon: <FaHandHolding />, titulo: 'Empréstimo e Devolução', subtitulo: 'Chromebooks da escola emprestados aos alunos' },
      { chave: 'chromebook.manutencoes', path: '/chromebook/manutencoes', label: 'Manutenção', icon: <FaTools />, titulo: 'Manutenção de Chromebook', subtitulo: 'Aparelhos enviados para conserto' },
      { chave: 'chromebook.alunos', path: '/chromebook/alunos', label: 'Alunos', icon: <FaUserGraduate />, titulo: 'Cadastro de Alunos', subtitulo: 'Alunos e suas turmas' },
      { chave: 'chromebook.turmas', path: '/chromebook/turmas', label: 'Turmas', icon: <FaChalkboardTeacher />, titulo: 'Cadastro de Turmas', subtitulo: 'Turmas por unidade e ano letivo' },
      { chave: 'chromebook.relatorios', path: '/chromebook/relatorios', label: 'Relatórios', icon: <FaChartBar />, titulo: 'Relatórios dos Chromebooks', subtitulo: 'Exporte dados em CSV ou PDF', somenteVer: true },
    ],
  },
  {
    key: 'admin',
    label: 'Administração',
    descricao: 'Usuários, perfis de acesso, unidades, auditoria e visão geral do sistema.',
    icon: <FaCogs />,
    base: '/admin',
    paginas: [
      { chave: 'admin.visao_geral', path: '/admin', label: 'Visão Geral', icon: <FaChartPie />, titulo: 'Visão Geral', subtitulo: 'Resumo dos dois módulos do sistema', somenteVer: true },
      { chave: 'admin.usuarios', path: '/admin/usuarios', label: 'Usuários', icon: <FaUser />, titulo: 'Cadastro de Usuários', subtitulo: 'Contas com acesso ao sistema' },
      { chave: 'admin.perfis', path: '/admin/perfis', label: 'Perfis de Acesso', icon: <FaUserShield />, titulo: 'Cadastro de Perfis de Acesso', subtitulo: 'Perfis e o que cada um pode acessar' },
      { chave: 'admin.unidades', path: '/admin/unidades', label: 'Unidades', icon: <FaBuilding />, titulo: 'Cadastro de Unidade', subtitulo: 'Unidades escolares (usadas pelo patrimônio e pelas turmas)' },
      { chave: 'admin.auditoria', path: '/admin/auditoria', label: 'Auditoria', icon: <FaHistory />, titulo: 'Log de Auditoria', subtitulo: 'Quem incluiu, alterou ou excluiu cada registro' },
    ],
  },
]

export const PAGINAS = MODULOS.flatMap((m) => m.paginas.map((p) => ({ ...p, modulo: m.key })))

export function moduloPorPath(pathname) {
  return MODULOS.find((m) => pathname === m.base || pathname.startsWith(m.base + '/')) || null
}

export function paginaPorPath(pathname) {
  return PAGINAS.find((p) => p.path === pathname) || null
}

export function paginaPorChave(chave) {
  return PAGINAS.find((p) => p.chave === chave) || null
}
