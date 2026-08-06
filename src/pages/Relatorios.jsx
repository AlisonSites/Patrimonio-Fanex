import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { formatCurrency, formatDate, patrimonioCodigo, exportToCSV } from '../lib/utils.js'
import { exportToPDF } from '../lib/exportPdf.js'

const TIPOS_RELATORIO = [
  { key: 'geral', label: 'Geral (todos os bens)' },
  { key: 'tipo', label: 'Agrupado por Tipo' },
  { key: 'unidade', label: 'Agrupado por Unidade' },
  { key: 'setor', label: 'Agrupado por Setor' },
  { key: 'responsavel', label: 'Agrupado por Responsável' },
  { key: 'fornecedor', label: 'Agrupado por Fornecedor' },
  { key: 'status', label: 'Por Status' },
  { key: 'garantia', label: 'Garantias a Vencer (60 dias)' },
]

export default function Relatorios() {
  const [patrimonios, setPatrimonios] = useState([])
  const [tipos, setTipos] = useState([])
  const [unidades, setUnidades] = useState([])
  const [setores, setSetores] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [relatorio, setRelatorio] = useState('geral')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroUnidade, setFiltroUnidade] = useState('todos')
  const [filtroSetor, setFiltroSetor] = useState('todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos')
  const [filtroFornecedor, setFiltroFornecedor] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    const [p, t, u, s, r, f] = await Promise.all([
      supabase.from('patrimonios').select(`*, tipos(id,nome), unidades(id,nome), setores(id,nome), responsaveis(id,nome), fornecedores(id,nome)`),
      supabase.from('tipos').select('*').order('nome'),
      supabase.from('unidades').select('*').order('nome'),
      supabase.from('setores').select('*').order('nome'),
      supabase.from('responsaveis').select('*').order('nome'),
      supabase.from('fornecedores').select('*').order('nome'),
    ])
    if (p.error) setError(p.error.message)
    else setPatrimonios(p.data || [])
    setTipos(t.data || []); setUnidades(u.data || []); setSetores(s.data || [])
    setResponsaveis(r.data || []); setFornecedores(f.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtrados = useMemo(() => {
    return patrimonios.filter((p) => {
      if (filtroTipo !== 'todos' && String(p.tipo_id) !== filtroTipo) return false
      if (filtroUnidade !== 'todos' && String(p.unidade_id) !== filtroUnidade) return false
      if (filtroSetor !== 'todos' && String(p.setor_id) !== filtroSetor) return false
      if (filtroResponsavel !== 'todos' && String(p.responsavel_id) !== filtroResponsavel) return false
      if (filtroFornecedor !== 'todos' && String(p.fornecedor_id) !== filtroFornecedor) return false
      if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false
      if (dataInicio && p.data_aquisicao && p.data_aquisicao < dataInicio) return false
      if (dataFim && p.data_aquisicao && p.data_aquisicao > dataFim) return false
      if (relatorio === 'garantia') {
        if (!p.vencimento_garantia) return false
        const hoje = new Date()
        const limite = new Date()
        limite.setDate(hoje.getDate() + 60)
        const d = new Date(p.vencimento_garantia + 'T00:00:00')
        if (!(d >= hoje && d <= limite)) return false
      }
      return true
    })
  }, [patrimonios, filtroTipo, filtroUnidade, filtroSetor, filtroResponsavel, filtroFornecedor, filtroStatus, dataInicio, dataFim, relatorio])

  // Colunas detalhadas (relatório geral / garantia / status)
  const colunasDetalhadas = [
    { key: 'codigo', label: 'ID' },
    { key: 'nome', label: 'Nome' },
    { key: 'modelo', label: 'Modelo' },
    { key: 'numero_serie', label: 'Nº Série' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'unidade', label: 'Unidade' },
    { key: 'setor', label: 'Setor' },
    { key: 'responsavel', label: 'Responsável' },
    { key: 'fornecedor', label: 'Fornecedor' },
    { key: 'valor_original', label: 'Valor Original' },
    { key: 'valor_compra', label: 'Valor Compra' },
    { key: 'data_aquisicao', label: 'Aquisição' },
    { key: 'vencimento_garantia', label: 'Garantia até' },
    { key: 'status', label: 'Status' },
  ]

  const linhasDetalhadas = useMemo(() => filtrados.map((p) => ({
    codigo: patrimonioCodigo(p.id),
    nome: p.nome,
    modelo: p.modelo,
    numero_serie: p.numero_serie,
    tipo: p.tipos?.nome || '-',
    unidade: p.unidades?.nome || '-',
    setor: p.setores?.nome || '-',
    responsavel: p.responsaveis?.nome || '-',
    fornecedor: p.fornecedores?.nome || '-',
    valor_original: formatCurrency(p.valor_original),
    valor_compra: formatCurrency(p.valor_compra),
    data_aquisicao: formatDate(p.data_aquisicao),
    vencimento_garantia: formatDate(p.vencimento_garantia),
    status: p.status === 'ativo' ? 'Ativo' : 'Inativo',
  })), [filtrados])

  // Agrupamentos
  function agrupar(getKey, getLabel) {
    const map = new Map()
    filtrados.forEach((p) => {
      const key = getKey(p) ?? '—'
      const label = getLabel(p) || 'Não informado'
      if (!map.has(key)) map.set(key, { grupo: label, quantidade: 0, valor_compra: 0, valor_original: 0 })
      const e = map.get(key)
      e.quantidade += 1
      e.valor_compra += Number(p.valor_compra) || 0
      e.valor_original += Number(p.valor_original) || 0
    })
    return Array.from(map.values()).sort((a, b) => b.quantidade - a.quantidade)
  }

  const agrupamentos = {
    tipo: agrupar((p) => p.tipo_id, (p) => p.tipos?.nome),
    unidade: agrupar((p) => p.unidade_id, (p) => p.unidades?.nome),
    setor: agrupar((p) => p.setor_id, (p) => p.setores?.nome),
    responsavel: agrupar((p) => p.responsavel_id, (p) => p.responsaveis?.nome),
    fornecedor: agrupar((p) => p.fornecedor_id, (p) => p.fornecedores?.nome),
    status: agrupar((p) => p.status, (p) => (p.status === 'ativo' ? 'Ativo' : 'Inativo')),
  }

  const colunasAgrupadas = [
    { key: 'grupo', label: 'Grupo' },
    { key: 'quantidade', label: 'Quantidade' },
    { key: 'valor_original_fmt', label: 'Valor Original' },
    { key: 'valor_compra_fmt', label: 'Valor Compra' },
  ]

  const ehAgrupado = ['tipo', 'unidade', 'setor', 'responsavel', 'fornecedor', 'status'].includes(relatorio)

  const linhasAgrupadasFmt = useMemo(() => {
    if (!ehAgrupado) return []
    return agrupamentos[relatorio].map((g) => ({
      grupo: g.grupo,
      quantidade: g.quantidade,
      valor_original_fmt: formatCurrency(g.valor_original),
      valor_compra_fmt: formatCurrency(g.valor_compra),
    }))
  }, [agrupamentos, relatorio, ehAgrupado])

  const colunasAtuais = ehAgrupado ? colunasAgrupadas : colunasDetalhadas
  const linhasAtuais = ehAgrupado ? linhasAgrupadasFmt : linhasDetalhadas

  const totalGeral = filtrados.reduce((acc, p) => acc + (Number(p.valor_compra) || 0), 0)
  const tituloRelatorio = TIPOS_RELATORIO.find((t) => t.key === relatorio)?.label || 'Relatório'

  function handleExportCSV() {
    exportToCSV(`relatorio_${relatorio}_${new Date().toISOString().slice(0, 10)}`, linhasAtuais, colunasAtuais)
  }

  function handleExportPDF() {
    exportToPDF({
      title: tituloRelatorio,
      subtitle: `Controle de Patrimônio Escolar — ${filtrados.length} registro(s)`,
      columns: colunasAtuais,
      rows: linhasAtuais,
      filename: `relatorio_${relatorio}_${new Date().toISOString().slice(0, 10)}`,
      totalsText: `Valor total de compra: ${formatCurrency(totalGeral)}`,
    })
  }

  function limparFiltros() {
    setFiltroTipo('todos'); setFiltroUnidade('todos'); setFiltroSetor('todos')
    setFiltroResponsavel('todos'); setFiltroFornecedor('todos'); setFiltroStatus('todos')
    setDataInicio(''); setDataFim('')
  }

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body">
          <div className="field full" style={{ marginBottom: 16 }}>
            <label>Tipo de Relatório</label>
            <select className="filter-select" value={relatorio} onChange={(e) => setRelatorio(e.target.value)}>
              {TIPOS_RELATORIO.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>

          <div className="toolbar" style={{ marginBottom: 4 }}>
            <select className="filter-select" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="todos">Todos os tipos</option>
              {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            <select className="filter-select" value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)}>
              <option value="todos">Todas as unidades</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <select className="filter-select" value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)}>
              <option value="todos">Todos os setores</option>
              {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            <select className="filter-select" value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}>
              <option value="todos">Todos os responsáveis</option>
              {responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
            <select className="filter-select" value={filtroFornecedor} onChange={(e) => setFiltroFornecedor(e.target.value)}>
              <option value="todos">Todos os fornecedores</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            <select className="filter-select" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
            <input type="date" className="filter-select" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} title="Aquisição de" />
            <input type="date" className="filter-select" value={dataFim} onChange={(e) => setDataFim(e.target.value)} title="Aquisição até" />
            <button className="btn btn-ghost btn-sm" onClick={limparFiltros}>Limpar filtros</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>{tituloRelatorio}</h3>
            <div className="topbar-sub">{filtrados.length} registro(s) · Total: {formatCurrency(totalGeral)}</div>
          </div>
          <div className="toolbar">
            <button className="btn btn-secondary" onClick={handleExportCSV}>⇩ Exportar CSV</button>
            <button className="btn btn-primary" onClick={handleExportPDF}>⇩ Exportar PDF</button>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : linhasAtuais.length === 0 ? (
            <div className="empty-state"><div className="icon">□</div>Nenhum dado para os filtros selecionados.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>{colunasAtuais.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {linhasAtuais.map((row, idx) => (
                  <tr key={idx}>
                    {colunasAtuais.map((c) => <td key={c.key}>{row[c.key]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="pagination"><span>{linhasAtuais.length} linha(s) no relatório</span></div>
      </div>
    </div>
  )
}
