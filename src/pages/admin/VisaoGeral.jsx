import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { formatCurrency, formatDateTime, todayISO } from '../../lib/utils.js'
import { exportToPDF } from '../../lib/exportPdf.js'
import { situacaoEmprestimo } from '../../lib/chromebook.js'
import { podeVer, useUsuario } from '../../lib/permissoes.js'
import { NOMES_TABELAS } from './Auditoria.jsx'
import { FaFilePdf, FaBoxes, FaLaptop, FaUsers } from 'react-icons/fa'

// Resumo dos dois módulos para o administrador, com exportação em PDF
export default function VisaoGeral() {
  const usuario = useUsuario()
  const [dados, setDados] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [pat, queb, cb, man, emp, alu, usu, aud] = await Promise.all([
        supabase.from('patrimonios').select('id,status,valor_compra'),
        supabase.from('patrimonio_quebrados').select('patrimonio_id'),
        supabase.from('chromebooks').select('id,propriedade,status'),
        supabase.from('manutencoes').select('id,status,custo'),
        supabase.from('emprestimos').select('id,data_devolucao,devolucao_prevista'),
        supabase.from('alunos').select('id,status'),
        supabase.from('usuarios').select('id,status'),
        supabase.from('auditoria').select('id,created_at,usuario_nome,acao,tabela').order('created_at', { ascending: false }).limit(10),
      ])
      // Erros das tabelas novas não impedem o resumo (ex.: scripts SQL ainda não executados)
      setError(pat.error?.message || '')
      setDados({
        patrimonios: pat.data || [],
        quebrados: queb.data || [],
        chromebooks: cb.data || [],
        manutencoes: man.data || [],
        emprestimos: emp.data || [],
        alunos: alu.data || [],
        usuarios: usu.data || [],
        auditoria: aud.data || [],
      })
    }
    load()
  }, [])

  const r = useMemo(() => {
    if (!dados) return null
    const quebradosIds = new Set(dados.quebrados.map((q) => q.patrimonio_id))
    const empAbertos = dados.emprestimos.filter((e) => !e.data_devolucao)
    return {
      patrimonio: [
        ['Patrimônios cadastrados', dados.patrimonios.length],
        ['Patrimônios ativos', dados.patrimonios.filter((p) => p.status === 'ativo').length],
        ['Valor total (compra)', formatCurrency(dados.patrimonios.reduce((a, p) => a + (Number(p.valor_compra) || 0), 0))],
        ['Bens com registro de quebra', dados.patrimonios.filter((p) => quebradosIds.has(p.id)).length],
      ],
      chromebook: [
        ['Chromebooks da escola', dados.chromebooks.filter((c) => c.propriedade === 'escola').length],
        ['Chromebooks dos alunos', dados.chromebooks.filter((c) => c.propriedade === 'aluno').length],
        ['Disponíveis para empréstimo', dados.chromebooks.filter((c) => c.propriedade === 'escola' && c.status === 'disponivel').length],
        ['Manutenções em aberto', dados.manutencoes.filter((m) => m.status !== 'finalizado').length],
        ['Custo total de manutenções', formatCurrency(dados.manutencoes.reduce((a, m) => a + (Number(m.custo) || 0), 0))],
        ['Empréstimos em aberto', empAbertos.length],
        ['Empréstimos atrasados', empAbertos.filter((e) => situacaoEmprestimo(e).key === 'atrasado').length],
        ['Alunos ativos', dados.alunos.filter((a) => a.status === 'ativo').length],
      ],
      sistema: [
        ['Usuários cadastrados', dados.usuarios.length],
        ['Usuários ativos', dados.usuarios.filter((u) => u.status === 'ativo').length],
      ],
    }
  }, [dados])

  function handleExportPDF() {
    const linhas = [
      ...r.patrimonio.map(([indicador, valor]) => ({ modulo: 'Patrimônio', indicador, valor })),
      ...r.chromebook.map(([indicador, valor]) => ({ modulo: 'Chromebooks', indicador, valor })),
      ...r.sistema.map(([indicador, valor]) => ({ modulo: 'Sistema', indicador, valor })),
    ]
    exportToPDF({
      title: 'Relatório Geral do Sistema',
      subtitle: 'Patrimônio e Chromebooks — resumo',
      columns: [{ key: 'modulo', label: 'Módulo' }, { key: 'indicador', label: 'Indicador' }, { key: 'valor', label: 'Valor' }],
      rows: linhas,
      filename: `relatorio_geral_${todayISO()}`,
      resumo: [],
    })
  }

  if (!r) return <div className="loading-state">Carregando...</div>

  const blocos = [
    { titulo: 'Patrimônio', icon: <FaBoxes />, itens: r.patrimonio, link: '/patrimonio' },
    { titulo: 'Chromebooks', icon: <FaLaptop />, itens: r.chromebook, link: '/chromebook' },
    { titulo: 'Sistema', icon: <FaUsers />, itens: r.sistema, link: '/admin/usuarios' },
  ]

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="visao-geral-acoes">
        <button className="btn btn-primary" onClick={handleExportPDF}><FaFilePdf /> Exportar relatório geral (PDF)</button>
      </div>

      <div className="grid-2 secao">
        {blocos.map((b) => (
          <div className="card" key={b.titulo}>
            <div className="card-header">
              <h3>{b.icon} {b.titulo}</h3>
              <Link className="btn btn-ghost btn-sm" to={b.link}>Abrir</Link>
            </div>
            <div className="card-body">
              {b.itens.map(([indicador, valor]) => (
                <div className="indicador-linha" key={indicador}>
                  <span>{indicador}</span>
                  <strong>{valor}</strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {podeVer(usuario, 'admin.auditoria') && (
        <div className="card">
          <div className="card-header">
            <h3>Últimas alterações</h3>
            <Link className="btn btn-ghost btn-sm" to="/admin/auditoria">Ver auditoria completa</Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Data/Hora</th><th>Usuário</th><th>Ação</th><th>Tela</th></tr></thead>
              <tbody>
                {dados.auditoria.length === 0 ? (
                  <tr><td colSpan={4} className="celula-vazia">Nenhuma alteração registrada ainda.</td></tr>
                ) : dados.auditoria.map((a) => (
                  <tr key={a.id}>
                    <td>{formatDateTime(a.created_at)}</td>
                    <td>{a.usuario_nome || '-'}</td>
                    <td>{{ inclusao: 'Inclusão', alteracao: 'Alteração', exclusao: 'Exclusão' }[a.acao]}</td>
                    <td>{NOMES_TABELAS[a.tabela] || a.tabela}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
