import { Fragment, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { formatDateTime } from '../../lib/utils.js'
import Badge from '../../components/Badge.jsx'
import { FaHistory, FaChevronDown, FaChevronRight } from 'react-icons/fa'

const POR_PAGINA = 50

export const NOMES_TABELAS = {
  patrimonios: 'Patrimônio',
  patrimonio_conservacoes: 'Conservação',
  patrimonio_movimentacoes: 'Movimentação',
  patrimonio_quebrados: 'Quebra de patrimônio',
  tipos: 'Tipo',
  unidades: 'Unidade',
  setores: 'Setor',
  responsaveis: 'Responsável',
  fornecedores: 'Fornecedor',
  usuarios: 'Usuário',
  perfis: 'Perfil de acesso',
  turmas: 'Turma',
  alunos: 'Aluno',
  chromebooks: 'Chromebook',
  emprestimos: 'Empréstimo',
  manutencoes: 'Manutenção',
}

const ACOES = {
  inclusao: { label: 'Inclusão', tom: 'verde' },
  alteracao: { label: 'Alteração', tom: 'azul' },
  exclusao: { label: 'Exclusão', tom: 'vermelho' },
}

const IGNORAR = ['updated_at', 'created_at', 'criado_em']

function valorTexto(v) {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

// Lista dos campos que mudaram (ou todos os campos, em inclusões/exclusões)
function diferencas(log) {
  const antes = log.dados_antes || {}
  const depois = log.dados_depois || {}
  const campos = Array.from(new Set([...Object.keys(antes), ...Object.keys(depois)])).filter((c) => !IGNORAR.includes(c))
  return campos
    .filter((c) => log.acao !== 'alteracao' || JSON.stringify(antes[c]) !== JSON.stringify(depois[c]))
    .map((c) => ({ campo: c, antes: valorTexto(antes[c]), depois: valorTexto(depois[c]) }))
}

// Identificação legível do registro afetado (nome, nº de série etc.)
function descricaoRegistro(log) {
  const d = log.dados_depois || log.dados_antes || {}
  return d.nome || d.numero_serie || d.ticket_geekie || (d.id != null ? `#${d.id}` : '-')
}

export default function Auditoria() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [tabela, setTabela] = useState('todos')
  const [acao, setAcao] = useState('todos')
  const [usuario, setUsuario] = useState('')
  const [usuarioBusca, setUsuarioBusca] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [aberto, setAberto] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    let q = supabase
      .from('auditoria')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * POR_PAGINA, page * POR_PAGINA - 1)
    if (tabela !== 'todos') q = q.eq('tabela', tabela)
    if (acao !== 'todos') q = q.eq('acao', acao)
    if (usuarioBusca) q = q.ilike('usuario_nome', `%${usuarioBusca}%`)
    if (dataInicio) q = q.gte('created_at', `${dataInicio}T00:00:00`)
    if (dataFim) q = q.lte('created_at', `${dataFim}T23:59:59`)
    const { data, count, error: err } = await q
    if (err) setError(err.message.includes('auditoria') ? 'A tabela de auditoria ainda não existe. Execute o script supabase_permissoes_auditoria.sql no Supabase.' : err.message)
    else { setRows(data || []); setTotal(count || 0) }
    setLoading(false)
  }

  useEffect(() => { load() }, [page, tabela, acao, usuarioBusca, dataInicio, dataFim])

  // Busca por usuário só depois que a pessoa para de digitar
  useEffect(() => {
    const t = setTimeout(() => { setUsuarioBusca(usuario.trim()); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [usuario])

  // Ao mudar um filtro, volta para a primeira página
  const filtro = (setter) => (e) => { setter(e.target.value); setPage(1) }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <select className="filter-select" value={tabela} onChange={filtro(setTabela)}>
              <option value="todos">Todas as telas</option>
              {Object.entries(NOMES_TABELAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="filter-select" value={acao} onChange={filtro(setAcao)}>
              <option value="todos">Todas as ações</option>
              {Object.entries(ACOES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input className="search-input" placeholder="Nome do usuário..." value={usuario} onChange={(e) => setUsuario(e.target.value)} />
            <input type="date" className="filter-select" value={dataInicio} onChange={filtro(setDataInicio)} title="De" />
            <input type="date" className="filter-select" value={dataFim} onChange={filtro(setDataFim)} title="Até" />
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : rows.length === 0 ? (
            <div className="empty-state"><div className="icon"><FaHistory /></div>Nenhum registro de auditoria encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th></th><th>Data/Hora</th><th>Usuário</th><th>Ação</th><th>Tela</th><th>Registro</th></tr>
              </thead>
              <tbody>
                {rows.map((log) => {
                  const a = ACOES[log.acao]
                  const expandido = aberto === log.id
                  return (
                    <Fragment key={log.id}>
                      <tr className="linha-clicavel" onClick={() => setAberto(expandido ? null : log.id)}>
                        <td>{expandido ? <FaChevronDown /> : <FaChevronRight />}</td>
                        <td>{formatDateTime(log.created_at)}</td>
                        <td>{log.usuario_nome || <span className="cell-sub">Não identificado</span>}</td>
                        <td><Badge tom={a?.tom}>{a?.label || log.acao}</Badge></td>
                        <td>{NOMES_TABELAS[log.tabela] || log.tabela}</td>
                        <td>{descricaoRegistro(log)}</td>
                      </tr>
                      {expandido && (
                        <tr className="auditoria-detalhe">
                          <td colSpan={6}>
                            <table className="ficha-table auditoria-diff">
                              <thead>
                                <tr>
                                  <th>Campo</th>
                                  {log.acao !== 'inclusao' && <th>Antes</th>}
                                  {log.acao !== 'exclusao' && <th>Depois</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {diferencas(log).map((d) => (
                                  <tr key={d.campo}>
                                    <td><strong>{d.campo}</strong></td>
                                    {log.acao !== 'inclusao' && <td>{d.antes}</td>}
                                    {log.acao !== 'exclusao' && <td>{d.depois}</td>}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="pagination">
          <span>{total} registro(s)</span>
          <div className="pagination-controls">
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
            <span>Página {page} de {totalPaginas}</span>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPaginas} onClick={() => setPage(page + 1)}>Próxima</button>
          </div>
        </div>
      </div>
    </div>
  )
}
