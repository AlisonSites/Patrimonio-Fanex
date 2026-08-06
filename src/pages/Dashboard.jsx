import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { formatCurrency } from '../lib/utils.js'

const TABS = [
  { key: 'geral', label: 'Geral' },
  { key: 'tipo', label: 'Por Tipo' },
  { key: 'unidade', label: 'Por Unidade' },
  { key: 'setor', label: 'Por Setor' },
  { key: 'responsavel', label: 'Por Responsável' },
]

export default function Dashboard() {
  const [patrimonios, setPatrimonios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('geral')

  async function load() {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('patrimonios')
      .select(`*, tipos(id,nome), unidades(id,nome), setores(id,nome), responsaveis(id,nome), fornecedores(id,nome)`)
    if (err) setError(err.message)
    else setPatrimonios(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const geral = useMemo(() => {
    const total = patrimonios.length
    const ativos = patrimonios.filter((p) => p.status === 'ativo').length
    const inativos = total - ativos
    const valorTotal = patrimonios.reduce((acc, p) => acc + (Number(p.valor_compra) || 0), 0)
    const valorOriginalTotal = patrimonios.reduce((acc, p) => acc + (Number(p.valor_original) || 0), 0)

    const hoje = new Date()
    const em30dias = new Date()
    em30dias.setDate(hoje.getDate() + 30)
    const garantiasVencendo = patrimonios.filter((p) => {
      if (!p.vencimento_garantia) return false
      const d = new Date(p.vencimento_garantia + 'T00:00:00')
      return d >= hoje && d <= em30dias
    }).length

    return { total, ativos, inativos, valorTotal, valorOriginalTotal, garantiasVencendo }
  }, [patrimonios])

  function groupBy(getKey, getLabel) {
    const map = new Map()
    patrimonios.forEach((p) => {
      const key = getKey(p) ?? '—'
      const label = getLabel(p) || 'Não informado'
      if (!map.has(key)) map.set(key, { label, total: 0, ativos: 0, inativos: 0, valor: 0 })
      const entry = map.get(key)
      entry.total += 1
      if (p.status === 'ativo') entry.ativos += 1
      else entry.inativos += 1
      entry.valor += Number(p.valor_compra) || 0
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }

  const porTipo = useMemo(() => groupBy((p) => p.tipo_id, (p) => p.tipos?.nome), [patrimonios])
  const porUnidade = useMemo(() => groupBy((p) => p.unidade_id, (p) => p.unidades?.nome), [patrimonios])
  const porSetor = useMemo(() => groupBy((p) => p.setor_id, (p) => p.setores?.nome), [patrimonios])
  const porResponsavel = useMemo(() => groupBy((p) => p.responsavel_id, (p) => p.responsaveis?.nome), [patrimonios])

  const groupedData = { tipo: porTipo, unidade: porUnidade, setor: porSetor, responsavel: porResponsavel }

  if (loading) return <div className="loading-state">Carregando dashboard...</div>

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total de Patrimônios</div>
          <div className="kpi-value">{geral.total}</div>
          <div className="kpi-extra">{geral.ativos} ativos · {geral.inativos} inativos</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Valor de Compra Total</div>
          <div className="kpi-value">{formatCurrency(geral.valorTotal)}</div>
          <div className="kpi-extra">Valor original: {formatCurrency(geral.valorOriginalTotal)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Garantias Vencendo</div>
          <div className="kpi-value">{geral.garantiasVencendo}</div>
          <div className="kpi-extra">Próximos 30 dias</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Percentual Ativos</div>
          <div className="kpi-value">{geral.total ? Math.round((geral.ativos / geral.total) * 100) : 0}%</div>
          <div className="kpi-extra">do total de patrimônios</div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'geral' ? (
        <div className="grid-2">
          <GroupCard title="Por Tipo" data={porTipo.slice(0, 6)} />
          <GroupCard title="Por Unidade" data={porUnidade.slice(0, 6)} />
          <GroupCard title="Por Setor" data={porSetor.slice(0, 6)} />
          <GroupCard title="Por Responsável" data={porResponsavel.slice(0, 6)} />
        </div>
      ) : (
        <div className="card">
          <div className="card-header"><h3>Detalhamento {TABS.find((t) => t.key === tab).label}</h3></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{TABS.find((t) => t.key === tab).label.replace('Por ', '')}</th>
                  <th>Total</th><th>Ativos</th><th>Inativos</th><th>Valor de Compra</th>
                </tr>
              </thead>
              <tbody>
                {groupedData[tab].length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--cinza-texto)' }}>Sem dados.</td></tr>
                ) : groupedData[tab].map((g) => (
                  <tr key={g.label}>
                    <td>{g.label}</td>
                    <td>{g.total}</td>
                    <td>{g.ativos}</td>
                    <td>{g.inativos}</td>
                    <td>{formatCurrency(g.valor)}</td>
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

function GroupCard({ title, data }) {
  const max = Math.max(1, ...data.map((d) => d.total))
  return (
    <div className="card">
      <div className="card-header"><h3>{title}</h3></div>
      <div className="card-body">
        {data.length === 0 ? (
          <div style={{ color: 'var(--cinza-texto)', fontSize: 13.5 }}>Sem dados.</div>
        ) : (
          data.map((d) => (
            <div key={d.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 5 }}>
                <span style={{ fontWeight: 600, color: 'var(--azul)' }}>{d.label}</span>
                <span style={{ color: 'var(--cinza-texto)' }}>{d.total} · {formatCurrency(d.valor)}</span>
              </div>
              <div style={{ background: 'var(--cinza-bg)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${(d.total / max) * 100}%`, height: '100%', background: 'var(--laranja)' }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
