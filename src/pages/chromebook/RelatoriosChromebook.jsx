import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { diasEntre, exportToCSV, formatCurrency, formatDate, todayISO } from '../../lib/utils.js'
import { exportToPDF } from '../../lib/exportPdf.js'
import {
  RESPONSAVEL_CUSTO, STATUS_ALUNO, STATUS_CHROMEBOOK, STATUS_MANUTENCAO, TIPOS_QUEBRA,
  situacaoEmprestimo, statusChromebook, tiposQuebraLabel, turmaLabel,
} from '../../lib/chromebook.js'
import SearchableSelect from '../../components/SearchableSelect.jsx'
import { FaFileCsv, FaFilePdf, FaInbox } from 'react-icons/fa'

const TIPOS_RELATORIO = [
  { key: 'chromebooks', label: 'Chromebooks' },
  { key: 'emprestimos', label: 'Empréstimos' },
  { key: 'manutencoes', label: 'Manutenções' },
  { key: 'alunos', label: 'Alunos por Turma' },
  { key: 'sem_chromebook', label: 'Alunos ativos sem Chromebook' },
]

const COLUNAS = {
  chromebooks: [
    { key: 'numero_serie', label: 'Nº de Série' },
    { key: 'marca', label: 'Marca' },
    { key: 'propriedade', label: 'Propriedade' },
    { key: 'aluno', label: 'Aluno' },
    { key: 'turma', label: 'Turma' },
    { key: 'status', label: 'Status' },
  ],
  emprestimos: [
    { key: 'chromebook', label: 'Chromebook' },
    { key: 'aluno', label: 'Aluno' },
    { key: 'turma', label: 'Turma' },
    { key: 'motivo', label: 'Motivo' },
    { key: 'retirada', label: 'Retirada' },
    { key: 'prevista', label: 'Prevista' },
    { key: 'devolucao', label: 'Devolução' },
    { key: 'dias', label: 'Dias' },
    { key: 'situacao', label: 'Situação' },
  ],
  manutencoes: [
    { key: 'chromebook', label: 'Chromebook' },
    { key: 'propriedade', label: 'Propriedade' },
    { key: 'aluno', label: 'Aluno' },
    { key: 'ida', label: 'Ida' },
    { key: 'retorno', label: 'Retorno' },
    { key: 'dias', label: 'Dias' },
    { key: 'quebra', label: 'Quebra' },
    { key: 'ticket', label: 'Ticket Geekie' },
    { key: 'custo', label: 'Custo' },
    { key: 'pagador', label: 'Quem paga' },
    { key: 'status', label: 'Status' },
  ],
  alunos: [
    { key: 'nome', label: 'Aluno' },
    { key: 'matricula', label: 'Matrícula' },
    { key: 'turma', label: 'Turma' },
    { key: 'proprio', label: 'Chromebook próprio' },
    { key: 'emprestado', label: 'Chromebook emprestado' },
    { key: 'status', label: 'Status' },
  ],
}
COLUNAS.sem_chromebook = COLUNAS.alunos.filter((c) => !['proprio', 'emprestado'].includes(c.key))

const noPeriodo = (data, inicio, fim) => (!inicio || (data && data >= inicio)) && (!fim || (data && data <= fim))

export default function RelatoriosChromebook() {
  const [chromebooks, setChromebooks] = useState([])
  const [emprestimos, setEmprestimos] = useState([])
  const [manutencoes, setManutencoes] = useState([])
  const [alunos, setAlunos] = useState([])
  const [turmas, setTurmas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [relatorio, setRelatorio] = useState('chromebooks')
  const [filtroPropriedade, setFiltroPropriedade] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroQuebra, setFiltroQuebra] = useState('todos')
  const [filtroTurma, setFiltroTurma] = useState('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [cb, emp, man, alu, tur] = await Promise.all([
        supabase.from('chromebooks').select('*, alunos(id,nome,turmas(nome,ano_letivo))').order('numero_serie'),
        supabase.from('emprestimos').select('*, chromebooks(numero_serie), alunos(nome,turmas(nome,ano_letivo)), manutencoes(ticket_geekie)').order('data_retirada', { ascending: false }),
        supabase.from('manutencoes').select('*, chromebooks(numero_serie,propriedade), alunos(nome)').order('data_ida', { ascending: false }),
        supabase.from('alunos').select('*, turmas(id,nome,ano_letivo)').order('nome'),
        supabase.from('turmas').select('id,nome,ano_letivo').order('ano_letivo', { ascending: false }).order('nome'),
      ])
      setError([cb, emp, man, alu, tur].find((r) => r.error)?.error.message || '')
      setChromebooks(cb.data || [])
      setEmprestimos(emp.data || [])
      setManutencoes(man.data || [])
      setAlunos(alu.data || [])
      setTurmas(tur.data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Troca de relatório: o filtro de status muda de significado, então volta para "todos"
  useEffect(() => { setFiltroStatus('todos') }, [relatorio])

  const linhas = useMemo(() => {
    if (relatorio === 'chromebooks') {
      return chromebooks
        .filter((c) => filtroPropriedade === 'todos' || c.propriedade === filtroPropriedade)
        .filter((c) => filtroStatus === 'todos' || c.status === filtroStatus)
        .map((c) => ({
          numero_serie: c.numero_serie,
          marca: c.marca || '-',
          propriedade: c.propriedade === 'aluno' ? 'Aluno' : 'Escola',
          aluno: c.alunos?.nome || '-',
          turma: c.alunos ? turmaLabel(c.alunos.turmas) : '-',
          status: statusChromebook(c).label,
        }))
    }
    if (relatorio === 'emprestimos') {
      return emprestimos
        .filter((e) => filtroStatus === 'todos' || situacaoEmprestimo(e).key === filtroStatus || (filtroStatus === 'abertos' && !e.data_devolucao))
        .filter((e) => noPeriodo(e.data_retirada, dataInicio, dataFim))
        .map((e) => ({
          chromebook: e.chromebooks?.numero_serie || '-',
          aluno: e.alunos?.nome || '-',
          turma: turmaLabel(e.alunos?.turmas),
          motivo: e.manutencoes ? `Manutenção (ticket ${e.manutencoes.ticket_geekie})` : e.observacao || '-',
          retirada: formatDate(e.data_retirada),
          prevista: formatDate(e.devolucao_prevista),
          devolucao: formatDate(e.data_devolucao),
          dias: diasEntre(e.data_retirada, e.data_devolucao),
          situacao: situacaoEmprestimo(e).label,
        }))
    }
    if (relatorio === 'manutencoes') {
      return manutencoes
        .filter((m) => filtroPropriedade === 'todos' || m.chromebooks?.propriedade === filtroPropriedade)
        .filter((m) => filtroStatus === 'todos' || m.status === filtroStatus)
        .filter((m) => filtroQuebra === 'todos' || (m.tipos_quebra || []).includes(filtroQuebra))
        .filter((m) => noPeriodo(m.data_ida, dataInicio, dataFim))
        .map((m) => ({
          chromebook: m.chromebooks?.numero_serie || '-',
          propriedade: m.chromebooks?.propriedade === 'aluno' ? 'Aluno' : 'Escola',
          aluno: m.alunos?.nome || '-',
          ida: formatDate(m.data_ida),
          retorno: formatDate(m.data_retorno),
          dias: diasEntre(m.data_ida, m.data_retorno),
          quebra: tiposQuebraLabel(m.tipos_quebra),
          ticket: m.ticket_geekie,
          custo: m.custo != null ? formatCurrency(m.custo) : '-',
          custo_num: Number(m.custo) || 0,
          pagador: RESPONSAVEL_CUSTO[m.responsavel_custo] || '-',
          status: STATUS_MANUTENCAO[m.status]?.label || m.status,
        }))
    }

    const proprioPorAluno = new Map(chromebooks.filter((c) => c.aluno_id).map((c) => [c.aluno_id, c.numero_serie]))
    const emprestadoPorAluno = new Map(emprestimos.filter((e) => !e.data_devolucao).map((e) => [e.aluno_id, e.chromebooks?.numero_serie]))
    return alunos
      .filter((a) => filtroTurma === 'todos' || (filtroTurma === 'sem' ? !a.turma_id : String(a.turma_id) === filtroTurma))
      .filter((a) => relatorio === 'sem_chromebook'
        ? a.status === 'ativo' && !proprioPorAluno.has(a.id) && !emprestadoPorAluno.has(a.id)
        : filtroStatus === 'todos' || a.status === filtroStatus)
      .sort((a, b) => turmaLabel(a.turmas).localeCompare(turmaLabel(b.turmas)) || a.nome.localeCompare(b.nome))
      .map((a) => ({
        nome: a.nome,
        matricula: a.matricula || '-',
        turma: turmaLabel(a.turmas),
        proprio: proprioPorAluno.get(a.id) || '-',
        emprestado: emprestadoPorAluno.get(a.id) || '-',
        status: STATUS_ALUNO[a.status]?.label || a.status,
      }))
  }, [relatorio, chromebooks, emprestimos, manutencoes, alunos, filtroPropriedade, filtroStatus, filtroQuebra, filtroTurma, dataInicio, dataFim])

  const colunas = COLUNAS[relatorio]
  const titulo = TIPOS_RELATORIO.find((t) => t.key === relatorio).label
  const totalCusto = relatorio === 'manutencoes' ? linhas.reduce((acc, l) => acc + l.custo_num, 0) : null
  const nomeArquivo = `relatorio_chromebook_${relatorio}_${todayISO()}`

  const statusOptions = {
    chromebooks: Object.entries(STATUS_CHROMEBOOK).map(([k, v]) => [k, v.label]),
    emprestimos: [['abertos', 'Em aberto'], ['atrasado', 'Atrasados'], ['devolvido', 'Devolvidos']],
    manutencoes: Object.entries(STATUS_MANUTENCAO).map(([k, v]) => [k, v.label]),
    alunos: Object.entries(STATUS_ALUNO).map(([k, v]) => [k, v.label]),
  }[relatorio]

  function limparFiltros() {
    setFiltroPropriedade('todos'); setFiltroStatus('todos'); setFiltroQuebra('todos')
    setFiltroTurma('todos'); setDataInicio(''); setDataFim('')
  }

  function handleExportPDF() {
    exportToPDF({
      title: `Chromebooks — ${titulo}`,
      subtitle: 'Controle de Chromebooks',
      columns: colunas,
      rows: linhas,
      filename: nomeArquivo,
      totalsText: totalCusto != null ? `Custo total: ${formatCurrency(totalCusto)}` : undefined,
    })
  }

  if (loading) return <div className="loading-state">Carregando relatórios...</div>

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card secao">
        <div className="card-body">
          <div className="field full secao-campo">
            <label>Tipo de Relatório</label>
            <select className="filter-select" value={relatorio} onChange={(e) => setRelatorio(e.target.value)}>
              {TIPOS_RELATORIO.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>

          <div className="toolbar">
            {(relatorio === 'chromebooks' || relatorio === 'manutencoes') && (
              <select className="filter-select" value={filtroPropriedade} onChange={(e) => setFiltroPropriedade(e.target.value)}>
                <option value="todos">Do aluno e da escola</option>
                <option value="aluno">Só dos alunos</option>
                <option value="escola">Só da escola</option>
              </select>
            )}
            {statusOptions && (
              <select className="filter-select" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                <option value="todos">Todos os status</option>
                {statusOptions.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            )}
            {relatorio === 'manutencoes' && (
              <select className="filter-select" value={filtroQuebra} onChange={(e) => setFiltroQuebra(e.target.value)}>
                <option value="todos">Todos os tipos de quebra</option>
                {TIPOS_QUEBRA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            )}
            {(relatorio === 'alunos' || relatorio === 'sem_chromebook') && (
              <SearchableSelect
                variant="filter"
                value={filtroTurma}
                onChange={setFiltroTurma}
                options={[
                  { value: 'todos', label: 'Todas as turmas' },
                  { value: 'sem', label: 'Sem turma' },
                  ...turmas.map((t) => ({ value: t.id, label: turmaLabel(t) })),
                ]}
              />
            )}
            {(relatorio === 'emprestimos' || relatorio === 'manutencoes') && (
              <>
                <input type="date" className="filter-select" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} title={relatorio === 'emprestimos' ? 'Retirada a partir de' : 'Ida a partir de'} />
                <input type="date" className="filter-select" value={dataFim} onChange={(e) => setDataFim(e.target.value)} title={relatorio === 'emprestimos' ? 'Retirada até' : 'Ida até'} />
              </>
            )}
            <button className="btn btn-ghost btn-sm" onClick={limparFiltros}>Limpar filtros</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>{titulo}</h3>
            <div className="topbar-sub">
              {linhas.length} registro(s){totalCusto != null && ` · Custo total: ${formatCurrency(totalCusto)}`}
            </div>
          </div>
          <div className="toolbar">
            <button className="btn btn-secondary" onClick={() => exportToCSV(nomeArquivo, linhas, colunas)}><FaFileCsv /> Exportar CSV</button>
            <button className="btn btn-primary" onClick={handleExportPDF}><FaFilePdf /> Exportar PDF</button>
          </div>
        </div>

        <div className="table-wrap">
          {linhas.length === 0 ? (
            <div className="empty-state"><div className="icon"><FaInbox /></div>Nenhum dado para os filtros selecionados.</div>
          ) : (
            <table className="data-table">
              <thead><tr>{colunas.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
              <tbody>
                {linhas.map((row, idx) => (
                  <tr key={idx}>{colunas.map((c) => <td key={c.key}>{row[c.key]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="pagination"><span>{linhas.length} linha(s) no relatório</span></div>
      </div>
    </div>
  )
}
