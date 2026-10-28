import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { diasEntre, formatDate, normalizarTexto } from '../../lib/utils.js'
import { STATUS_MANUTENCAO, TIPOS_QUEBRA, situacaoEmprestimo, tiposQuebraLabel } from '../../lib/chromebook.js'
import BarList from '../../components/BarList.jsx'
import Badge from '../../components/Badge.jsx'
import FichaChromebook from './FichaChromebook.jsx'
import { FaBarcode } from 'react-icons/fa'

export default function DashboardChromebook() {
  const [chromebooks, setChromebooks] = useState([])
  const [manutencoes, setManutencoes] = useState([])
  const [emprestimos, setEmprestimos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busca, setBusca] = useState('')
  const [buscaErro, setBuscaErro] = useState('')
  const [fichaId, setFichaId] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [cbRes, manRes, empRes] = await Promise.all([
        supabase.from('chromebooks').select('id,numero_serie,marca,propriedade,status'),
        supabase.from('manutencoes').select('id,chromebook_id,data_ida,data_retorno,tipos_quebra,status,ticket_geekie,chromebooks(numero_serie),alunos(nome)'),
        supabase.from('emprestimos').select('id,data_retirada,devolucao_prevista,data_devolucao,manutencoes(status)'),
      ])
      setError(cbRes.error?.message || manRes.error?.message || empRes.error?.message || '')
      setChromebooks(cbRes.data || [])
      setManutencoes(manRes.data || [])
      setEmprestimos(empRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const k = useMemo(() => {
    const escola = chromebooks.filter((c) => c.propriedade === 'escola')
    const aluno = chromebooks.filter((c) => c.propriedade === 'aluno')
    const conta = (lista, status) => lista.filter((c) => c.status === status).length
    const abertas = manutencoes.filter((m) => m.status !== 'finalizado')
    const finalizadas = manutencoes.filter((m) => m.status === 'finalizado' && m.data_retorno)
    const empAbertos = emprestimos.filter((e) => !e.data_devolucao)
    return {
      escola: escola.length,
      escolaDisponiveis: conta(escola, 'disponivel'),
      escolaEmprestados: conta(escola, 'emprestado'),
      escolaManutencao: conta(escola, 'manutencao'),
      escolaBaixados: conta(escola, 'baixado'),
      aluno: aluno.length,
      alunoManutencao: conta(aluno, 'manutencao'),
      manAbertas: abertas.length,
      manPendentes: abertas.filter((m) => m.status === 'pendente').length,
      manAndamento: abertas.filter((m) => m.status === 'em_andamento').length,
      empAbertos: empAbertos.length,
      empAtrasados: empAbertos.filter((e) => situacaoEmprestimo(e).key === 'atrasado').length,
      aRecolher: empAbertos.filter((e) => e.manutencoes?.status === 'finalizado').length,
      tempoMedio: finalizadas.length
        ? Math.round(finalizadas.reduce((acc, m) => acc + diasEntre(m.data_ida, m.data_retorno), 0) / finalizadas.length)
        : null,
      abertasMaisAntigas: [...abertas].sort((a, b) => (a.data_ida < b.data_ida ? -1 : 1)).slice(0, 8),
    }
  }, [chromebooks, manutencoes, emprestimos])

  const porQuebra = useMemo(
    () => TIPOS_QUEBRA
      .map((t) => ({ label: t.label, total: manutencoes.filter((m) => (m.tipos_quebra || []).includes(t.value)).length }))
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total),
    [manutencoes]
  )

  const porMarca = useMemo(() => {
    const map = new Map()
    chromebooks.forEach((c) => {
      const label = c.marca?.trim() || 'Não informada'
      map.set(label, (map.get(label) || 0) + 1)
    })
    return Array.from(map, ([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total)
  }, [chromebooks])

  // Marcas com mais manutenções (proporcional ao total de aparelhos da marca)
  const quebraPorMarca = useMemo(() => {
    const marcaDe = new Map(chromebooks.map((c) => [c.id, c.marca?.trim() || 'Não informada']))
    const totalMarca = new Map(porMarca.map((m) => [m.label, m.total]))
    const map = new Map()
    manutencoes.forEach((m) => {
      const label = marcaDe.get(m.chromebook_id) || 'Não informada'
      map.set(label, (map.get(label) || 0) + 1)
    })
    return Array.from(map, ([label, total]) => ({
      label, total, extra: `${total} manutenção(ões) · ${totalMarca.get(label) || 0} aparelho(s)`,
    })).sort((a, b) => b.total - a.total)
  }, [chromebooks, manutencoes, porMarca])

  function handleBusca(e) {
    e.preventDefault()
    setBuscaErro('')
    const cb = chromebooks.find((c) => normalizarTexto(c.numero_serie) === normalizarTexto(busca))
    if (cb) { setFichaId(cb.id); setBusca('') }
    else setBuscaErro('Nenhum Chromebook com esse número de série.')
  }

  if (loading) return <div className="loading-state">Carregando dashboard...</div>

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <form className="card busca-rapida" onSubmit={handleBusca}>
        <FaBarcode size={22} />
        <input
          className="search-input"
          placeholder="Busca rápida: digite ou leia o nº de série e aperte Enter"
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setBuscaErro('') }}
          autoFocus
        />
        <button className="btn btn-primary" type="submit">Abrir ficha</button>
        {buscaErro && <span className="busca-rapida-erro">{buscaErro}</span>}
      </form>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Chromebooks da Escola</div>
          <div className="kpi-value">{k.escola}</div>
          <div className="kpi-extra">{k.escolaDisponiveis} disponíveis · {k.escolaEmprestados} emprestados · {k.escolaManutencao} em manutenção · {k.escolaBaixados} baixados</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Chromebooks dos Alunos</div>
          <div className="kpi-value">{k.aluno}</div>
          <div className="kpi-extra">{k.alunoManutencao} em manutenção agora</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Disponíveis para Empréstimo</div>
          <div className={`kpi-value ${k.escolaDisponiveis ? 'texto-verde' : 'texto-vermelho'}`}>{k.escolaDisponiveis}</div>
          <div className="kpi-extra">Chromebooks da escola livres</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Manutenções em Aberto</div>
          <div className="kpi-value texto-laranja">{k.manAbertas}</div>
          <div className="kpi-extra">{k.manPendentes} pendentes · {k.manAndamento} em andamento</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Empréstimos em Aberto</div>
          <div className="kpi-value">{k.empAbertos}</div>
          <div className={`kpi-extra ${k.empAtrasados ? 'texto-alerta' : ''}`}>
            {k.empAtrasados} atrasado(s)
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">A Recolher</div>
          <div className={`kpi-value ${k.aRecolher ? 'texto-vermelho' : ''}`}>{k.aRecolher}</div>
          <div className="kpi-extra">manutenção finalizada, mas o aluno ainda está com o da escola</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Tempo Médio de Manutenção</div>
          <div className="kpi-value">{k.tempoMedio != null ? `${k.tempoMedio} dias` : '-'}</div>
          <div className="kpi-extra">entre ida e retorno (finalizadas)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total de Manutenções</div>
          <div className="kpi-value">{manutencoes.length}</div>
          <div className="kpi-extra">desde o início dos registros</div>
        </div>
      </div>

      <div className="grid-2 secao">
        <BarList title="Manutenções por Tipo de Quebra" data={porQuebra} accent="var(--vermelho)" />
        <BarList title="Manutenções por Marca" data={quebraPorMarca} accent="var(--vermelho)" />
        <BarList title="Chromebooks por Marca" data={porMarca} />
      </div>

      <div className="card">
        <div className="card-header"><h3>Manutenções em aberto há mais tempo</h3></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Chromebook</th><th>Aluno</th><th>Ida</th><th>Dias</th><th>Quebra</th><th>Ticket</th><th>Status</th></tr></thead>
            <tbody>
              {k.abertasMaisAntigas.length === 0 ? (
                <tr><td colSpan={7} className="celula-vazia">Nenhuma manutenção em aberto.</td></tr>
              ) : k.abertasMaisAntigas.map((m) => (
                <tr key={m.id} className="linha-clicavel" onClick={() => setFichaId(m.chromebook_id)}>
                  <td><strong>{m.chromebooks?.numero_serie}</strong></td>
                  <td>{m.alunos?.nome || '-'}</td>
                  <td>{formatDate(m.data_ida)}</td>
                  <td>{diasEntre(m.data_ida)}</td>
                  <td>{tiposQuebraLabel(m.tipos_quebra)}</td>
                  <td>{m.ticket_geekie}</td>
                  <td><Badge tom={STATUS_MANUTENCAO[m.status]?.tom}>{STATUS_MANUTENCAO[m.status]?.label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {fichaId && <FichaChromebook chromebookId={fichaId} onClose={() => setFichaId(null)} />}
    </div>
  )
}
