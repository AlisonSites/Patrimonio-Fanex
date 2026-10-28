import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { diasEntre, formatDate, normalizarTexto, todayISO } from '../../lib/utils.js'
import {
  RESPONSAVEL_CUSTO, STATUS_MANUTENCAO, TIPOS_QUEBRA, chromebookLabel, manutencaoCodigo,
  tiposQuebraLabel,
} from '../../lib/chromebook.js'
import { podeEditar as temPermissaoEditar, usePodeEditar, useUsuario } from '../../lib/permissoes.js'
import Modal from '../../components/Modal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import SearchableSelect from '../../components/SearchableSelect.jsx'
import Badge from '../../components/Badge.jsx'
import FichaChromebook from './FichaChromebook.jsx'
import { FaEdit, FaTrash, FaTools, FaIdCard, FaCheck, FaHandHolding } from 'react-icons/fa'

const EMPTY_FORM = {
  chromebook_id: '',
  aluno_id: '',
  data_ida: todayISO(),
  data_retorno: '',
  tipos_quebra: [],
  descricao: '',
  ticket_geekie: '',
  status: 'pendente',
  custo: '',
  responsavel_custo: '',
  observacao: '',
}

export default function Manutencoes() {
  const podeEditar = usePodeEditar()
  const usuario = useUsuario()
  const podeEmprestar = temPermissaoEditar(usuario, 'chromebook.emprestimos')
  const navigate = useNavigate()

  const [rows, setRows] = useState([])
  const [chromebooks, setChromebooks] = useState([])
  const [alunos, setAlunos] = useState([])
  const [emprestimosAbertos, setEmprestimosAbertos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('abertas')
  const [quebraFilter, setQuebraFilter] = useState('todos')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [finalizando, setFinalizando] = useState(null)
  const [fichaId, setFichaId] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    const [manRes, cbRes, alunosRes, empRes] = await Promise.all([
      supabase
        .from('manutencoes')
        .select('*, chromebooks(id,numero_serie,marca,propriedade,aluno_id), alunos(id,nome)')
        .order('data_ida', { ascending: false }),
      supabase.from('chromebooks').select('id,numero_serie,marca,propriedade,status,aluno_id,alunos(id,nome)').order('numero_serie'),
      supabase.from('alunos').select('id,nome,status').order('nome'),
      supabase.from('emprestimos').select('id,aluno_id,manutencao_id,chromebooks(numero_serie)').is('data_devolucao', null),
    ])
    if (manRes.error) setError(manRes.error.message)
    else setRows(manRes.data || [])
    setChromebooks(cbRes.data || [])
    setAlunos(alunosRes.data || [])
    setEmprestimosAbertos(empRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const emprestimoPorAluno = useMemo(
    () => new Map(emprestimosAbertos.map((e) => [e.aluno_id, e])),
    [emprestimosAbertos]
  )

  function openNew() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    setForm({
      chromebook_id: row.chromebook_id,
      aluno_id: row.aluno_id || '',
      data_ida: row.data_ida || todayISO(),
      data_retorno: row.data_retorno || '',
      tipos_quebra: row.tipos_quebra || [],
      descricao: row.descricao || '',
      ticket_geekie: row.ticket_geekie || '',
      status: row.status,
      custo: row.custo ?? '',
      responsavel_custo: row.responsavel_custo || '',
      observacao: row.observacao || '',
    })
    setEditing(row)
    setModalOpen(true)
  }

  const cbSelecionado = chromebooks.find((c) => String(c.id) === String(form.chromebook_id))

  // Ao escolher um Chromebook do aluno, o aluno é preenchido automaticamente
  function handleChromebookChange(id) {
    const cb = chromebooks.find((c) => String(c.id) === String(id))
    setForm({ ...form, chromebook_id: id, aluno_id: cb?.propriedade === 'aluno' ? cb.aluno_id : form.aluno_id })
  }

  function toggleQuebra(valor) {
    const atual = form.tipos_quebra
    setForm({ ...form, tipos_quebra: atual.includes(valor) ? atual.filter((t) => t !== valor) : [...atual, valor] })
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (form.tipos_quebra.length === 0) { setError('Marque pelo menos um tipo de quebra.'); return }
    if (form.tipos_quebra.includes('outro') && !form.descricao.trim()) {
      setError('Descreva o problema quando o tipo de quebra for "Outro".')
      return
    }
    setSaving(true)
    const payload = {
      chromebook_id: form.chromebook_id,
      aluno_id: form.aluno_id || null,
      data_ida: form.data_ida,
      data_retorno: form.status === 'finalizado' ? form.data_retorno || todayISO() : null,
      tipos_quebra: form.tipos_quebra,
      descricao: form.descricao.trim() || null,
      ticket_geekie: form.ticket_geekie.trim(),
      status: form.status,
      custo: form.custo === '' ? null : Number(form.custo),
      responsavel_custo: form.responsavel_custo || null,
      observacao: form.observacao.trim() || null,
    }
    let err, data
    if (editing) {
      ;({ error: err } = await supabase.from('manutencoes').update(payload).eq('id', editing.id))
    } else {
      ;({ data, error: err } = await supabase.from('manutencoes').insert(payload).select('id').single())
    }
    setSaving(false)
    if (err) {
      setError(err.message.includes('uq_manutencao_aberta') ? 'Este Chromebook já tem uma manutenção em aberto.' : err.message)
      return
    }
    setModalOpen(false)
    montarAviso({ ...payload, id: editing?.id ?? data?.id }, cbSelecionado)
    load()
  }

  // Depois de salvar, sugere o próximo passo: emprestar um substituto ou recolher o emprestado
  function montarAviso(manutencao, cb) {
    setAviso(null)
    if (cb?.propriedade !== 'aluno' || !manutencao.aluno_id) return
    const emprestimo = emprestimoPorAluno.get(Number(manutencao.aluno_id))
    const nomeAluno = cb.alunos?.nome || 'O aluno'
    if (manutencao.status !== 'finalizado' && !emprestimo) {
      setAviso({ tipo: 'emprestar', texto: `${nomeAluno} está sem Chromebook enquanto o dele está em manutenção.`, manutencao })
    } else if (manutencao.status === 'finalizado' && emprestimo) {
      setAviso({ tipo: 'devolver', texto: `O Chromebook de ${nomeAluno} voltou da manutenção. Ele ainda está com o Chromebook da escola ${emprestimo.chromebooks?.numero_serie} — registre a devolução.` })
    }
  }

  function irParaEmprestimo(manutencao) {
    navigate(`/chromebook/emprestimos?novo=1&aluno=${manutencao.aluno_id}&manutencao=${manutencao.id}`)
  }

  async function handleFinalizar() {
    const row = finalizando
    setFinalizando(null)
    const { error: err } = await supabase
      .from('manutencoes')
      .update({ status: 'finalizado', data_retorno: todayISO() })
      .eq('id', row.id)
    if (err) { setError(err.message); return }
    const cb = chromebooks.find((c) => c.id === row.chromebook_id)
    montarAviso({ ...row, status: 'finalizado' }, cb)
    load()
  }

  async function handleDelete() {
    const { error: err } = await supabase.from('manutencoes').delete().eq('id', deleting.id)
    if (err) { setError(err.message); setDeleting(null); return }
    setDeleting(null)
    load()
  }

  const chromebookOptions = useMemo(
    () => chromebooks
      .filter((c) => c.status !== 'baixado' || String(c.id) === String(form.chromebook_id))
      .map((c) => ({
        value: c.id,
        label: `${chromebookLabel(c)} — ${c.propriedade === 'aluno' ? `Aluno: ${c.alunos?.nome || '-'}` : 'Escola'}`,
      })),
    [chromebooks, form.chromebook_id]
  )

  const filtered = useMemo(() => {
    const termo = normalizarTexto(search)
    return rows.filter((r) => {
      const matchesSearch = termo
        ? [r.chromebooks?.numero_serie, r.alunos?.nome, r.ticket_geekie, r.descricao].some((v) => normalizarTexto(v).includes(termo))
        : true
      const matchesStatus =
        statusFilter === 'todos' ? true : statusFilter === 'abertas' ? r.status !== 'finalizado' : r.status === statusFilter
      const matchesQuebra = quebraFilter === 'todos' ? true : (r.tipos_quebra || []).includes(quebraFilter)
      return matchesSearch && matchesStatus && matchesQuebra
    })
  }, [rows, search, statusFilter, quebraFilter])

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      {aviso && (
        <div className="alert alert-info alert-acao">
          <span>{aviso.texto}</span>
          <div className="alert-acao-botoes">
            {aviso.tipo === 'emprestar' && podeEmprestar && (
              <button className="btn btn-primary btn-sm" onClick={() => irParaEmprestimo(aviso.manutencao)}>
                <FaHandHolding /> Emprestar Chromebook da escola
              </button>
            )}
            {aviso.tipo === 'devolver' && (
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/chromebook/emprestimos')}>
                Ir para Empréstimos
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setAviso(null)}>Fechar</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <input className="search-input" placeholder="Buscar por nº de série, aluno, ticket..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="abertas">Em aberto (pendente + em andamento)</option>
              <option value="todos">Todos os status</option>
              {Object.entries(STATUS_MANUTENCAO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="filter-select" value={quebraFilter} onChange={(e) => setQuebraFilter(e.target.value)}>
              <option value="todos">Todos os tipos de quebra</option>
              {TIPOS_QUEBRA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {podeEditar && <button className="btn btn-primary" onClick={openNew} disabled={chromebooks.length === 0}>+ Registrar Manutenção</button>}
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon"><FaTools /></div>Nenhuma manutenção encontrada.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Chromebook</th><th>Aluno</th><th>Ida</th><th>Dias</th><th>Quebra</th>
                  <th>Ticket Geekie</th><th>Status</th><th>Substituto</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const st = STATUS_MANUTENCAO[row.status]
                  const aberta = row.status !== 'finalizado'
                  const doAluno = row.chromebooks?.propriedade === 'aluno'
                  const emprestimo = row.aluno_id ? emprestimoPorAluno.get(row.aluno_id) : null
                  return (
                    <tr key={row.id}>
                      <td>{manutencaoCodigo(row.id)}</td>
                      <td>
                        <strong>{row.chromebooks?.numero_serie || '-'}</strong>
                        <div className="cell-sub">{doAluno ? 'Do aluno' : 'Da escola'}</div>
                      </td>
                      <td>{row.alunos?.nome || '-'}</td>
                      <td>{formatDate(row.data_ida)}</td>
                      <td>{diasEntre(row.data_ida, row.data_retorno)}</td>
                      <td>{tiposQuebraLabel(row.tipos_quebra)}</td>
                      <td>{row.ticket_geekie}</td>
                      <td><Badge tom={st?.tom}>{st?.label || row.status}</Badge></td>
                      <td>
                        {!doAluno ? '-' : emprestimo ? (
                          <span title="Chromebook da escola emprestado ao aluno">{emprestimo.chromebooks?.numero_serie}</span>
                        ) : aberta && podeEmprestar ? (
                          <button className="btn btn-ghost btn-sm" onClick={() => irParaEmprestimo(row)}><FaHandHolding /> Emprestar</button>
                        ) : '-'}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-btn" title="Ficha do Chromebook" onClick={() => setFichaId(row.chromebook_id)}><FaIdCard /></button>
                          {podeEditar && aberta && <button className="icon-btn" title="Finalizar manutenção" onClick={() => setFinalizando(row)}><FaCheck /></button>}
                          {podeEditar && <button className="icon-btn" title="Editar" onClick={() => openEdit(row)}><FaEdit /></button>}
                          {podeEditar && <button className="icon-btn danger" title="Excluir" onClick={() => setDeleting(row)}><FaTrash /></button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="pagination"><span>{filtered.length} registro(s)</span></div>
      </div>

      {modalOpen && (
        <Modal
          title={editing ? `Editar Manutenção — ${manutencaoCodigo(editing.id)}` : 'Registrar Manutenção'}
          onClose={() => setModalOpen(false)}
          maxWidth={720}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" form="manutencao-form" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="manutencao-form" className="form-grid" onSubmit={handleSave}>
            <div className="field full">
              <label>Chromebook *</label>
              <SearchableSelect
                required
                value={form.chromebook_id}
                onChange={handleChromebookChange}
                placeholder="Digite o nº de série"
                options={chromebookOptions}
              />
            </div>
            <div className="field full">
              <label>Aluno</label>
              {cbSelecionado?.propriedade === 'aluno' ? (
                <div className="field-readonly">{cbSelecionado.alunos?.nome || '-'}</div>
              ) : (
                <SearchableSelect
                  value={form.aluno_id}
                  onChange={(v) => setForm({ ...form, aluno_id: v })}
                  placeholder="Quem estava usando (opcional)"
                  options={[
                    { value: '', label: 'Não informado' },
                    ...alunos.filter((a) => a.status === 'ativo' || String(a.id) === String(form.aluno_id)).map((a) => ({ value: a.id, label: a.nome })),
                  ]}
                />
              )}
            </div>
            <div className="field">
              <label>Dia de ida para manutenção *</label>
              <input required type="date" value={form.data_ida} onChange={(e) => setForm({ ...form, data_ida: e.target.value })} />
            </div>
            <div className="field">
              <label>Ticket da Geekie *</label>
              <input required value={form.ticket_geekie} onChange={(e) => setForm({ ...form, ticket_geekie: e.target.value })} />
            </div>
            <div className="field full">
              <label>Tipo de quebra * (pode marcar mais de um)</label>
              <div className="checkbox-group">
                {TIPOS_QUEBRA.map((t) => (
                  <label key={t.value} className={`checkbox-chip ${form.tipos_quebra.includes(t.value) ? 'ativo' : ''}`}>
                    <input type="checkbox" checked={form.tipos_quebra.includes(t.value)} onChange={() => toggleQuebra(t.value)} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="field full">
              <label>Descrição do problema {form.tipos_quebra.includes('outro') && '*'}</label>
              <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="field">
              <label>Status *</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_MANUTENCAO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            {form.status === 'finalizado' && (
              <div className="field">
                <label>Data de retorno</label>
                <input type="date" value={form.data_retorno || todayISO()} onChange={(e) => setForm({ ...form, data_retorno: e.target.value })} />
              </div>
            )}
            <div className="field">
              <label>Custo (R$)</label>
              <input type="number" min="0" step="0.01" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} />
            </div>
            <div className="field">
              <label>Quem paga</label>
              <select value={form.responsavel_custo} onChange={(e) => setForm({ ...form, responsavel_custo: e.target.value })}>
                <option value="">Não informado</option>
                {Object.entries(RESPONSAVEL_CUSTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field full">
              <label>Observação</label>
              <textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}

      {fichaId && <FichaChromebook chromebookId={fichaId} onClose={() => setFichaId(null)} />}

      {finalizando && (
        <ConfirmDialog
          title="Finalizar Manutenção"
          message={`Confirmar o retorno do Chromebook ${finalizando.chromebooks?.numero_serie} hoje? Ele volta a ficar ${finalizando.chromebooks?.propriedade === 'aluno' ? 'com o aluno' : 'disponível'}.`}
          onCancel={() => setFinalizando(null)}
          onConfirm={handleFinalizar}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir Manutenção"
          message="Tem certeza que deseja excluir este registro de manutenção? O status do Chromebook será recalculado."
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          danger
        />
      )}
    </div>
  )
}
