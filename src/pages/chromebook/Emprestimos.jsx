import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { diasEntre, formatDate, normalizarTexto, todayISO } from '../../lib/utils.js'
import {
  STATUS_MANUTENCAO, chromebookLabel, emprestimoCodigo, situacaoEmprestimo, turmaLabel,
} from '../../lib/chromebook.js'
import { usePodeEditar, useUsuario } from '../../lib/permissoes.js'
import Modal from '../../components/Modal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import SearchableSelect from '../../components/SearchableSelect.jsx'
import Badge from '../../components/Badge.jsx'
import FichaChromebook from './FichaChromebook.jsx'
import { FaEdit, FaTrash, FaHandHolding, FaUndo, FaIdCard } from 'react-icons/fa'

const EMPTY_FORM = {
  chromebook_id: '',
  aluno_id: '',
  manutencao_id: '',
  data_retirada: todayISO(),
  devolucao_prevista: '',
  observacao: '',
}

const ESTADOS_DEVOLUCAO = ['Perfeito estado', 'Com riscos/marcas', 'Com avaria', 'Sem carregador']

export default function Emprestimos() {
  const podeEditar = usePodeEditar()
  const usuario = useUsuario()
  const [searchParams, setSearchParams] = useSearchParams()

  const [rows, setRows] = useState([])
  const [chromebooks, setChromebooks] = useState([])
  const [alunos, setAlunos] = useState([])
  const [manutencoes, setManutencoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [situacaoFilter, setSituacaoFilter] = useState('abertos')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [devolvendo, setDevolvendo] = useState(null)
  const [devolucao, setDevolucao] = useState({ data_devolucao: todayISO(), estado_devolucao: '', observacao: '' })
  const [deleting, setDeleting] = useState(null)
  const [fichaId, setFichaId] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    const [empRes, cbRes, alunosRes, manRes] = await Promise.all([
      supabase
        .from('emprestimos')
        .select('*, chromebooks(id,numero_serie,marca), alunos(id,nome,turmas(nome,ano_letivo)), manutencoes(id,ticket_geekie,status,chromebooks(numero_serie))')
        .order('data_retirada', { ascending: false }),
      supabase.from('chromebooks').select('id,numero_serie,marca,status').eq('propriedade', 'escola').order('numero_serie'),
      supabase.from('alunos').select('id,nome,matricula,status,turmas(nome,ano_letivo)').order('nome'),
      supabase.from('manutencoes').select('id,aluno_id,ticket_geekie,status,data_ida,chromebooks(numero_serie,propriedade)').neq('status', 'finalizado'),
    ])
    if (empRes.error) setError(empRes.error.message)
    else setRows(empRes.data || [])
    setChromebooks(cbRes.data || [])
    setAlunos(alunosRes.data || [])
    setManutencoes(manRes.data || [])
    setLoading(false)
    return { manutencoes: manRes.data || [] }
  }

  // Vindo da tela de Manutenção ("Emprestar Chromebook da escola"): abre o formulário já preenchido
  useEffect(() => {
    load().then(({ manutencoes: abertas }) => {
      if (searchParams.get('novo') !== '1') return
      const alunoId = searchParams.get('aluno') || ''
      const manutencaoId = searchParams.get('manutencao') || ''
      setSearchParams({}, { replace: true })
      if (!podeEditar) return
      setForm({
        ...EMPTY_FORM,
        aluno_id: alunoId,
        manutencao_id: manutencaoId || abertas.find((m) => String(m.aluno_id) === alunoId)?.id || '',
      })
      setEditing(null)
      setModalOpen(true)
    })
  }, [])

  function openNew() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    setForm({
      chromebook_id: row.chromebook_id,
      aluno_id: row.aluno_id,
      manutencao_id: row.manutencao_id || '',
      data_retirada: row.data_retirada,
      devolucao_prevista: row.devolucao_prevista || '',
      observacao: row.observacao || '',
    })
    setEditing(row)
    setModalOpen(true)
  }

  // Ao trocar o aluno, já vincula a manutenção em aberto do Chromebook dele (se houver)
  function handleAlunoChange(id) {
    const man = manutencoes.find((m) => String(m.aluno_id) === String(id))
    setForm({ ...form, aluno_id: id, manutencao_id: man?.id || '' })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      chromebook_id: form.chromebook_id,
      aluno_id: form.aluno_id,
      manutencao_id: form.manutencao_id || null,
      data_retirada: form.data_retirada,
      devolucao_prevista: form.devolucao_prevista || null,
      observacao: form.observacao.trim() || null,
    }
    let err
    if (editing) {
      ;({ error: err } = await supabase.from('emprestimos').update(payload).eq('id', editing.id))
    } else {
      payload.registrado_por = usuario?.id != null ? String(usuario.id) : null
      ;({ error: err } = await supabase.from('emprestimos').insert(payload))
    }
    setSaving(false)
    if (err) {
      if (err.message.includes('uq_emprestimo_aberto_aluno')) setError('Este aluno já está com um Chromebook emprestado. Registre a devolução antes.')
      else if (err.message.includes('uq_emprestimo_aberto_chromebook')) setError('Este Chromebook já está emprestado.')
      else setError(err.message)
      return
    }
    setModalOpen(false)
    load()
  }

  function openDevolucao(row) {
    setDevolucao({ data_devolucao: todayISO(), estado_devolucao: '', observacao: row.observacao || '' })
    setDevolvendo(row)
  }

  async function handleDevolucao(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('emprestimos')
      .update({
        data_devolucao: devolucao.data_devolucao,
        estado_devolucao: devolucao.estado_devolucao.trim() || null,
        observacao: devolucao.observacao.trim() || null,
      })
      .eq('id', devolvendo.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    setDevolvendo(null)
    load()
  }

  async function handleDelete() {
    const { error: err } = await supabase.from('emprestimos').delete().eq('id', deleting.id)
    if (err) { setError(err.message); setDeleting(null); return }
    setDeleting(null)
    load()
  }

  // Só Chromebooks da escola disponíveis (ou o do próprio empréstimo, ao editar)
  const chromebookOptions = useMemo(
    () => chromebooks
      .filter((c) => c.status === 'disponivel' || String(c.id) === String(form.chromebook_id))
      .map((c) => ({ value: c.id, label: chromebookLabel(c) })),
    [chromebooks, form.chromebook_id]
  )

  const alunosComEmprestimo = useMemo(
    () => new Set(rows.filter((r) => !r.data_devolucao && r.id !== editing?.id).map((r) => r.aluno_id)),
    [rows, editing]
  )

  const alunoOptions = useMemo(
    () => alunos
      .filter((a) => String(a.id) === String(form.aluno_id) || (a.status === 'ativo' && !alunosComEmprestimo.has(a.id)))
      .map((a) => ({ value: a.id, label: `${a.nome}${a.turmas ? ` — ${turmaLabel(a.turmas)}` : ''}${a.matricula ? ` (${a.matricula})` : ''}` })),
    [alunos, alunosComEmprestimo, form.aluno_id]
  )

  const manutencaoOptions = useMemo(() => {
    const doAluno = manutencoes.filter((m) => String(m.aluno_id) === String(form.aluno_id))
    // Ao editar, mantém a manutenção já vinculada mesmo que tenha sido finalizada
    if (editing?.manutencoes && !doAluno.some((m) => m.id === editing.manutencao_id)) doAluno.push(editing.manutencoes)
    return doAluno.map((m) => ({
      value: m.id,
      label: `${m.chromebooks?.numero_serie || ''} — ticket ${m.ticket_geekie} (${STATUS_MANUTENCAO[m.status]?.label || m.status})`,
    }))
  }, [manutencoes, form.aluno_id, editing])

  const filtered = useMemo(() => {
    const termo = normalizarTexto(search)
    return rows.filter((r) => {
      const sit = situacaoEmprestimo(r).key
      const matchesSearch = termo
        ? [r.chromebooks?.numero_serie, r.alunos?.nome, r.manutencoes?.ticket_geekie].some((v) => normalizarTexto(v).includes(termo))
        : true
      const matchesSituacao =
        situacaoFilter === 'todos' ? true
          : situacaoFilter === 'abertos' ? sit !== 'devolvido'
          : situacaoFilter === 'recolher' ? sit !== 'devolvido' && r.manutencoes?.status === 'finalizado'
          : sit === situacaoFilter
      return matchesSearch && matchesSituacao
    })
  }, [rows, search, situacaoFilter])

  // Empréstimos cujo motivo (manutenção do Chromebook do aluno) já terminou
  const paraRecolher = rows.filter((r) => !r.data_devolucao && r.manutencoes?.status === 'finalizado').length

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      {paraRecolher > 0 && situacaoFilter !== 'recolher' && (
        <div className="alert alert-info alert-acao">
          <span>
            <strong>{paraRecolher}</strong> aluno(s) já receberam o Chromebook de volta da manutenção, mas ainda estão com o da escola.
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => setSituacaoFilter('recolher')}>Ver quais</button>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <input className="search-input" placeholder="Buscar por nº de série, aluno, ticket..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="filter-select" value={situacaoFilter} onChange={(e) => setSituacaoFilter(e.target.value)}>
              <option value="abertos">Em aberto</option>
              <option value="atrasado">Atrasados</option>
              <option value="recolher">A recolher (manutenção finalizada)</option>
              <option value="devolvido">Devolvidos</option>
              <option value="todos">Todos</option>
            </select>
          </div>
          {podeEditar && <button className="btn btn-primary" onClick={openNew}>+ Novo Empréstimo</button>}
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon"><FaHandHolding /></div>Nenhum empréstimo encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Chromebook</th><th>Aluno</th><th>Motivo</th><th>Retirada</th>
                  <th>Prevista</th><th>Devolução</th><th>Dias</th><th>Situação</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const sit = situacaoEmprestimo(row)
                  const man = row.manutencoes
                  const recolher = !row.data_devolucao && man?.status === 'finalizado'
                  return (
                    <tr key={row.id}>
                      <td>{emprestimoCodigo(row.id)}</td>
                      <td><strong>{row.chromebooks?.numero_serie || '-'}</strong></td>
                      <td>
                        {row.alunos?.nome || '-'}
                        <div className="cell-sub">{turmaLabel(row.alunos?.turmas)}</div>
                      </td>
                      <td>
                        {man ? (
                          <>
                            Manutenção · ticket {man.ticket_geekie}
                            <div className="cell-sub">
                              {recolher ? <Badge tom="laranja">Manutenção finalizada — recolher</Badge> : STATUS_MANUTENCAO[man.status]?.label}
                            </div>
                          </>
                        ) : (row.observacao || '-')}
                      </td>
                      <td>{formatDate(row.data_retirada)}</td>
                      <td>{formatDate(row.devolucao_prevista)}</td>
                      <td>
                        {formatDate(row.data_devolucao)}
                        {row.estado_devolucao && <div className="cell-sub">{row.estado_devolucao}</div>}
                      </td>
                      <td>{diasEntre(row.data_retirada, row.data_devolucao)}</td>
                      <td><Badge tom={sit.tom}>{sit.label}</Badge></td>
                      <td>
                        <div className="row-actions">
                          {podeEditar && !row.data_devolucao && (
                            <button className="icon-btn" title="Registrar devolução" onClick={() => openDevolucao(row)}><FaUndo /></button>
                          )}
                          <button className="icon-btn" title="Ficha do Chromebook" onClick={() => setFichaId(row.chromebook_id)}><FaIdCard /></button>
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
          title={editing ? `Editar Empréstimo — ${emprestimoCodigo(editing.id)}` : 'Novo Empréstimo'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" form="emprestimo-form" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="emprestimo-form" className="form-grid" onSubmit={handleSave}>
            <div className="field full">
              <label>Aluno *</label>
              <SearchableSelect
                required
                value={form.aluno_id}
                onChange={handleAlunoChange}
                placeholder="Selecione o aluno"
                options={alunoOptions}
              />
            </div>
            <div className="field full">
              <label>Chromebook da escola *</label>
              <SearchableSelect
                required
                value={form.chromebook_id}
                onChange={(v) => setForm({ ...form, chromebook_id: v })}
                placeholder={chromebookOptions.length ? 'Digite o nº de série' : 'Nenhum Chromebook da escola disponível'}
                options={chromebookOptions}
              />
              <div className="field-hint">Só aparecem os Chromebooks da escola com status Disponível.</div>
            </div>
            <div className="field full">
              <label>Manutenção relacionada</label>
              <select value={form.manutencao_id} onChange={(e) => setForm({ ...form, manutencao_id: e.target.value })}>
                <option value="">Nenhuma (outro motivo)</option>
                {manutencaoOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <div className="field-hint">Quando o Chromebook do aluno está em manutenção, o empréstimo fica ligado a ela.</div>
            </div>
            <div className="field">
              <label>Data de retirada *</label>
              <input required type="date" value={form.data_retirada} onChange={(e) => setForm({ ...form, data_retirada: e.target.value })} />
            </div>
            <div className="field">
              <label>Devolução prevista</label>
              <input type="date" min={form.data_retirada} value={form.devolucao_prevista} onChange={(e) => setForm({ ...form, devolucao_prevista: e.target.value })} />
              <div className="field-hint">Deixe em branco se depender do fim da manutenção.</div>
            </div>
            <div className="field full">
              <label>Observação</label>
              <textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}

      {devolvendo && (
        <Modal
          title="Registrar Devolução"
          onClose={() => setDevolvendo(null)}
          maxWidth={520}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setDevolvendo(null)}>Cancelar</button>
              <button className="btn btn-primary" form="devolucao-form" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Confirmar devolução'}
              </button>
            </>
          }
        >
          <form id="devolucao-form" className="form-grid" onSubmit={handleDevolucao}>
            <div className="field full">
              <div className="field-readonly">
                {devolvendo.chromebooks?.numero_serie} — {devolvendo.alunos?.nome}
              </div>
            </div>
            <div className="field">
              <label>Data da devolução *</label>
              <input required type="date" min={devolvendo.data_retirada} value={devolucao.data_devolucao} onChange={(e) => setDevolucao({ ...devolucao, data_devolucao: e.target.value })} />
            </div>
            <div className="field">
              <label>Estado na devolução</label>
              <input list="estados-devolucao" value={devolucao.estado_devolucao} onChange={(e) => setDevolucao({ ...devolucao, estado_devolucao: e.target.value })} />
              <datalist id="estados-devolucao">
                {ESTADOS_DEVOLUCAO.map((e) => <option key={e} value={e} />)}
              </datalist>
            </div>
            <div className="field full">
              <label>Observação</label>
              <textarea value={devolucao.observacao} onChange={(e) => setDevolucao({ ...devolucao, observacao: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}

      {fichaId && <FichaChromebook chromebookId={fichaId} onClose={() => setFichaId(null)} />}

      {deleting && (
        <ConfirmDialog
          title="Excluir Empréstimo"
          message="Tem certeza que deseja excluir este empréstimo? Se ele estiver em aberto, o Chromebook volta a ficar disponível."
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          danger
        />
      )}
    </div>
  )
}
