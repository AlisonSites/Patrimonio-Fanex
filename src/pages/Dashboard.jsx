import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { formatCurrency, formatDate, patrimonioCodigo } from '../lib/utils.js'

const TABS = [
  { key: 'geral', label: 'Geral' },
  { key: 'tipo', label: 'Por Tipo' },
  { key: 'unidade', label: 'Por Unidade' },
  { key: 'setor', label: 'Por Setor' },
  { key: 'responsavel', label: 'Por Responsável' },
  { key: 'quebrados', label: 'Quebrados' },
]

export default function Dashboard() {
  const [patrimonios, setPatrimonios] = useState([])
  const [quebrados, setQuebrados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('geral')

  async function load() {
    setLoading(true)
    setError('')
    const [patRes, quebRes] = await Promise.all([
      supabase
        .from('patrimonios')
        .select(`*, tipos(id,nome), unidades(id,nome), setores(id,nome), responsaveis(id,nome), fornecedores(id,nome)`),
      supabase
        .from('patrimonio_quebrados')
        .select('*, patrimonios(id,nome,modelo,valor_compra,tipo_id,tipos(nome))')
        .order('data', { ascending: false }),
    ])
    let errMsg = ''
    if (patRes.error) errMsg = patRes.error.message
    else setPatrimonios(patRes.data || [])
    if (quebRes.error) errMsg = errMsg || quebRes.error.message
    else setQuebrados(quebRes.data || [])
    setError(errMsg)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // IDs (únicos) de patrimônios que possuem ao menos um registro de quebra
  const quebradosIds = useMemo(() => new Set(quebrados.map((q) => String(q.patrimonio_id))), [quebrados])

  const geral = useMemo(() => {
    const total = patrimonios.length
    const ativos = patrimonios.filter((p) => p.status === 'ativo').length
    const inativos = total - ativos
    const valorTotal = patrimonios.reduce((acc, p) => acc + (Number(p.valor_compra) || 0), 0)
    const valorOriginalTotal = patrimonios.reduce((acc, p) => acc + (Number(p.valor_original) || 0), 0)

    const bensQuebrados = patrimonios.filter((p) => quebradosIds.has(String(p.id)))
    const bensIntegros = patrimonios.filter((p) => !quebradosIds.has(String(p.id)))
    const valorQuebrados = bensQuebrados.reduce((acc, p) => acc + (Number(p.valor_compra) || 0), 0)
    const valorIntegros = bensIntegros.reduce((acc, p) => acc + (Number(p.valor_compra) || 0), 0)

    const hoje = new Date()
    const em30dias = new Date()
    em30dias.setDate(hoje.getDate() + 30)
    const garantiasVencendo = patrimonios.filter((p) => {
      if (!p.vencimento_garantia) return false
      const d = new Date(p.vencimento_garantia + 'T00:00:00')
      return d >= hoje && d <= em30dias
    }).length
    const garantiasVencidas = patrimonios.filter((p) => {
      if (!p.vencimento_garantia) return false
      const d = new Date(p.vencimento_garantia + 'T00:00:00')
      return d < hoje
    }).length

    const valorMedio = total ? valorTotal / total : 0

    return {
      total, ativos, inativos, valorTotal, valorOriginalTotal,
      qtdQuebrados: bensQuebrados.length, qtdIntegros: bensIntegros.length,
      valorQuebrados, valorIntegros,
      garantiasVencendo, garantiasVencidas, valorMedio,
    }
  }, [patrimonios, quebradosIds])

  function groupBy(getKey, getLabel) {
    const map = new Map()
    patrimonios.forEach((p) => {
      const key = getKey(p) ?? '—'
      const label = getLabel(p) || 'Não informado'
      if (!map.has(key)) map.set(key, { label, total: 0, ativos: 0, inativos: 0, valor: 0, quebrados: 0 })
      const entry = map.get(key)
      entry.total += 1
      if (p.status === 'ativo') entry.ativos += 1
      else entry.inativos += 1
      entry.valor += Number(p.valor_compra) || 0
      if (quebradosIds.has(String(p.id))) entry.quebrados += 1
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }

  const porTipo = useMemo(() => groupBy((p) => p.tipo_id, (p) => p.tipos?.nome), [patrimonios, quebradosIds])
  const porUnidade = useMemo(() => groupBy((p) => p.unidade_id, (p) => p.unidades?.nome), [patrimonios, quebradosIds])
  const porSetor = useMemo(() => groupBy((p) => p.setor_id, (p) => p.setores?.nome), [patrimonios, quebradosIds])
  const porResponsavel = useMemo(() => groupBy((p) => p.responsavel_id, (p) => p.responsaveis?.nome), [patrimonios, quebradosIds])

  const groupedData = { tipo: porTipo, unidade: porUnidade, setor: porSetor, responsavel: porResponsavel }

  const quebradosPorMotivo = useMemo(() => {
    const map = new Map()
    quebrados.forEach((q) => {
      const key = q.motivo?.trim() || 'Não informado'
      if (!map.has(key)) map.set(key, { label: key, total: 0, valor: 0 })
      const entry = map.get(key)
      entry.total += 1
      entry.valor += Number(q.patrimonios?.valor_compra) || 0
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [quebrados])

  const quebradosPorTipo = useMemo(() => {
    const map = new Map()
    quebrados.forEach((q) => {
      const key = q.patrimonios?.tipo_id ?? '—'
      const label = q.patrimonios?.tipos?.nome || 'Não informado'
      if (!map.has(key)) map.set(key, { label, total: 0, valor: 0 })
      const entry = map.get(key)
      entry.total += 1
      entry.valor += Number(q.patrimonios?.valor_compra) || 0
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [quebrados])

  const motivoMaisComum = quebradosPorMotivo[0]?.label || '-'

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
          <div className="kpi-label">Valor Geral (Compra)</div>
          <div className="kpi-value">{formatCurrency(geral.valorTotal)}</div>
          <div className="kpi-extra">Valor original: {formatCurrency(geral.valorOriginalTotal)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Bens Íntegros</div>
          <div className="kpi-value" style={{ color: 'var(--verde)' }}>{formatCurrency(geral.valorIntegros)}</div>
          <div className="kpi-extra">{geral.qtdIntegros} bem(ns) sem quebra</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Bens Quebrados</div>
          <div className="kpi-value" style={{ color: 'var(--vermelho)' }}>{formatCurrency(geral.valorQuebrados)}</div>
          <div className="kpi-extra">{geral.qtdQuebrados} bem(ns) quebrado(s)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">% Quebrados</div>
          <div className="kpi-value">{geral.total ? Math.round((geral.qtdQuebrados / geral.total) * 100) : 0}%</div>
          <div className="kpi-extra">do total de patrimônios</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Valor Médio por Bem</div>
          <div className="kpi-value">{formatCurrency(geral.valorMedio)}</div>
          <div className="kpi-extra">considerando valor de compra</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Garantias Vencendo</div>
          <div className="kpi-value">{geral.garantiasVencendo}</div>
          <div className="kpi-extra">Próximos 30 dias</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Garantias Vencidas</div>
          <div className="kpi-value">{geral.garantiasVencidas}</div>
          <div className="kpi-extra">já expiraram</div>
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
          <GroupCard title="Quebrados por Tipo" data={quebradosPorTipo.slice(0, 6)} accent="var(--vermelho)" />
          <GroupCard title="Quebrados por Motivo" data={quebradosPorMotivo.slice(0, 6)} accent="var(--vermelho)" />
        </div>
      ) : tab === 'quebrados' ? (
        <div>
          <div className="kpi-grid" style={{ marginBottom: 18 }}>
            <div className="kpi-card">
              <div className="kpi-label">Quantidade Quebrados</div>
              <div className="kpi-value" style={{ color: 'var(--vermelho)' }}>{geral.qtdQuebrados}</div>
              <div className="kpi-extra">de {geral.total} patrimônios</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Valor Total Quebrados</div>
              <div className="kpi-value" style={{ color: 'var(--vermelho)' }}>{formatCurrency(geral.valorQuebrados)}</div>
              <div className="kpi-extra">{geral.total ? Math.round((geral.qtdQuebrados / geral.total) * 100) : 0}% do valor geral</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Motivo Mais Comum</div>
              <div className="kpi-value" style={{ fontSize: 18 }}>{motivoMaisComum}</div>
              <div className="kpi-extra">entre os registros de quebra</div>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 18 }}>
            <GroupCard title="Quebrados por Motivo" data={quebradosPorMotivo} accent="var(--vermelho)" />
            <GroupCard title="Quebrados por Tipo" data={quebradosPorTipo} accent="var(--vermelho)" />
          </div>

          <div className="card">
            <div className="card-header"><h3>Registros de Quebra</h3></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patrimônio</th><th>Tipo</th><th>Data</th><th>Motivo</th><th>Valor de Compra</th>
                  </tr>
                </thead>
                <tbody>
                  {quebrados.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--cinza-texto)' }}>Sem registros de quebra.</td></tr>
                  ) : quebrados.map((q) => (
                    <tr key={q.id}>
                      <td>{patrimonioCodigo(q.patrimonio_id)} — {q.patrimonios?.nome || '-'}</td>
                      <td>{q.patrimonios?.tipos?.nome || '-'}</td>
                      <td>{formatDate(q.data)}</td>
                      <td>{q.motivo || '-'}</td>
                      <td>{formatCurrency(q.patrimonios?.valor_compra)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination"><span>{quebrados.length} registro(s)</span></div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header"><h3>Detalhamento {TABS.find((t) => t.key === tab).label}</h3></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{TABS.find((t) => t.key === tab).label.replace('Por ', '')}</th>
                  <th>Total</th><th>Ativos</th><th>Inativos</th><th>Quebrados</th><th>Valor de Compra</th>
                </tr>
              </thead>
              <tbody>
                {groupedData[tab].length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--cinza-texto)' }}>Sem dados.</td></tr>
                ) : groupedData[tab].map((g) => (
                  <tr key={g.label}>
                    <td>{g.label}</td>
                    <td>{g.total}</td>
                    <td>{g.ativos}</td>
                    <td>{g.inativos}</td>
                    <td>{g.quebrados}</td>
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

function GroupCard({ title, data, accent }) {
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
                <div style={{ width: `${(d.total / max) * 100}%`, height: '100%', background: accent || 'var(--laranja)' }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}