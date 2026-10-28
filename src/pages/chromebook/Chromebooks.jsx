import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { normalizarTexto } from '../../lib/utils.js'
import { STATUS_CHROMEBOOK, chromebookCodigo, statusChromebook, turmaLabel } from '../../lib/chromebook.js'
import { usePodeEditar } from '../../lib/permissoes.js'
import Modal from '../../components/Modal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import SearchableSelect from '../../components/SearchableSelect.jsx'
import Badge from '../../components/Badge.jsx'
import FichaChromebook from './FichaChromebook.jsx'
import { FaEdit, FaTrash, FaLaptop, FaIdCard } from 'react-icons/fa'

const EMPTY_FORM = { numero_serie: '', marca: '', aluno_id: '', status: 'disponivel', observacao: '' }

/**
 * Cadastro de Chromebooks. A mesma tela serve para os aparelhos dos alunos
 * (propriedade="aluno", com aluno obrigatório) e os da escola (propriedade="escola").
 */
export default function Chromebooks({ propriedade }) {
  const podeEditar = usePodeEditar()
  const doAluno = propriedade === 'aluno'
  const [rows, setRows] = useState([])
  const [alunos, setAlunos] = useState([])
  const [emprestimosAbertos, setEmprestimosAbertos] = useState([])
  const [marcas, setMarcas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [marcaFilter, setMarcaFilter] = useState('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [fichaId, setFichaId] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    const [cbRes, alunosRes, empRes, marcasRes] = await Promise.all([
      supabase
        .from('chromebooks')
        .select('*, alunos(id,nome,turmas(nome,ano_letivo))')
        .eq('propriedade', propriedade)
        .order('numero_serie'),
      doAluno
        ? supabase.from('alunos').select('id,nome,matricula,status,turmas(nome,ano_letivo)').order('nome')
        : Promise.resolve({ data: [] }),
      doAluno
        ? Promise.resolve({ data: [] })
        : supabase.from('emprestimos').select('chromebook_id, alunos(nome)').is('data_devolucao', null),
      supabase.from('chromebooks').select('marca').not('marca', 'is', null),
    ])
    if (cbRes.error) setError(cbRes.error.message)
    else setRows(cbRes.data || [])
    setAlunos(alunosRes.data || [])
    setEmprestimosAbertos(empRes.data || [])
    setMarcas(Array.from(new Set((marcasRes.data || []).map((m) => m.marca.trim()).filter(Boolean))).sort())
    setLoading(false)
  }

  useEffect(() => { load() }, [propriedade])

  const emprestadoPara = useMemo(
    () => new Map(emprestimosAbertos.map((e) => [e.chromebook_id, e.alunos?.nome])),
    [emprestimosAbertos]
  )

  function openNew() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    setForm({
      numero_serie: row.numero_serie,
      marca: row.marca || '',
      aluno_id: row.aluno_id || '',
      status: row.status,
      observacao: row.observacao || '',
    })
    setEditing(row)
    setModalOpen(true)
  }

  // Empréstimo e manutenção mudam o status sozinhos; à mão só dá para baixar ou reativar
  const statusControladoPeloSistema = editing && ['emprestado', 'manutencao'].includes(editing.status)

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (doAluno && !form.aluno_id) { setError('Selecione o aluno dono do Chromebook.'); return }
    setSaving(true)
    const payload = {
      numero_serie: form.numero_serie.trim().toUpperCase(),
      marca: form.marca.trim() || null,
      propriedade,
      aluno_id: doAluno ? form.aluno_id : null,
      observacao: form.observacao.trim() || null,
    }
    if (!statusControladoPeloSistema) payload.status = form.status

    let err
    if (editing) {
      ;({ error: err } = await supabase.from('chromebooks').update(payload).eq('id', editing.id))
    } else {
      ;({ error: err } = await supabase.from('chromebooks').insert(payload))
    }
    setSaving(false)
    if (err) {
      setError(err.message.includes('chromebooks_numero_serie_key') ? 'Já existe um Chromebook com esse número de série.' : err.message)
      return
    }
    setModalOpen(false)
    load()
  }

  async function handleDelete() {
    const { error: err } = await supabase.from('chromebooks').delete().eq('id', deleting.id)
    if (err) {
      setError(
        err.message.includes('foreign key')
          ? 'Este Chromebook tem empréstimos ou manutenções registrados e não pode ser excluído. Mude o status para "Baixado".'
          : err.message
      )
      setDeleting(null)
      return
    }
    setDeleting(null)
    load()
  }

  // Leitor de código de barras "digita" o nº de série e aperta Enter: abre a ficha direto
  function handleSearchKeyDown(e) {
    if (e.key !== 'Enter') return
    const exato = rows.find((r) => normalizarTexto(r.numero_serie) === normalizarTexto(search))
    if (exato) setFichaId(exato.id)
  }

  const filtered = useMemo(() => {
    const termo = normalizarTexto(search)
    return rows.filter((r) => {
      const matchesSearch = termo
        ? [r.numero_serie, r.marca, r.alunos?.nome, emprestadoPara.get(r.id)].some((v) => normalizarTexto(v).includes(termo))
        : true
      const matchesStatus = statusFilter === 'todos' ? true : r.status === statusFilter
      const matchesMarca = marcaFilter === 'todos' ? true : (r.marca || '') === marcaFilter
      return matchesSearch && matchesStatus && matchesMarca
    })
  }, [rows, search, statusFilter, marcaFilter, emprestadoPara])

  const statusOptions = Object.entries(STATUS_CHROMEBOOK).filter(([k]) => !doAluno || k !== 'emprestado')

  const alunoOptions = useMemo(
    () => alunos
      .filter((a) => a.status === 'ativo' || String(a.id) === String(form.aluno_id))
      .map((a) => ({ value: a.id, label: `${a.nome}${a.turmas ? ` — ${turmaLabel(a.turmas)}` : ''}${a.matricula ? ` (${a.matricula})` : ''}` })),
    [alunos, form.aluno_id]
  )

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <input
              className="search-input"
              placeholder={doAluno ? 'Buscar por nº de série, marca ou aluno...' : 'Buscar por nº de série, marca ou aluno com empréstimo...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              title="Dica: com leitor de código de barras, leia o nº de série para abrir a ficha"
            />
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todos">Todos os status</option>
              {statusOptions.map(([k, v]) => (
                <option key={k} value={k}>{doAluno && k === 'disponivel' ? 'Com o aluno' : v.label}</option>
              ))}
            </select>
            {marcas.length > 0 && (
              <select className="filter-select" value={marcaFilter} onChange={(e) => setMarcaFilter(e.target.value)}>
                <option value="todos">Todas as marcas</option>
                {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
          {podeEditar && <button className="btn btn-primary" onClick={openNew}>+ Novo Chromebook</button>}
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon"><FaLaptop /></div>Nenhum Chromebook encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Nº de Série</th><th>Marca</th>
                  {doAluno ? <><th>Aluno</th><th>Turma</th></> : <th>Emprestado para</th>}
                  <th>Status</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const st = statusChromebook(row)
                  return (
                    <tr key={row.id}>
                      <td>{chromebookCodigo(row.id)}</td>
                      <td><strong>{row.numero_serie}</strong></td>
                      <td>{row.marca || '-'}</td>
                      {doAluno ? (
                        <>
                          <td>{row.alunos?.nome || '-'}</td>
                          <td>{turmaLabel(row.alunos?.turmas)}</td>
                        </>
                      ) : (
                        <td>{emprestadoPara.get(row.id) || '-'}</td>
                      )}
                      <td><Badge tom={st.tom}>{st.label}</Badge></td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-btn" title="Ver ficha e histórico" onClick={() => setFichaId(row.id)}><FaIdCard /></button>
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
          title={editing ? 'Editar Chromebook' : doAluno ? 'Novo Chromebook do Aluno' : 'Novo Chromebook da Escola'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" form="chromebook-form" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="chromebook-form" className="form-grid" onSubmit={handleSave}>
            {editing && (
              <div className="field full">
                <label>ID</label>
                <div className="field-readonly">{chromebookCodigo(editing.id)}</div>
              </div>
            )}
            <div className="field">
              <label>Nº de Série *</label>
              <input required autoFocus value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} />
            </div>
            <div className="field">
              <label>Marca</label>
              <input list="marcas-chromebook" placeholder="Ex: Acer, Lenovo, Samsung..." value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
              <datalist id="marcas-chromebook">
                {marcas.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>
            {doAluno && (
              <div className="field full">
                <label>Aluno *</label>
                <SearchableSelect
                  required
                  value={form.aluno_id}
                  onChange={(v) => setForm({ ...form, aluno_id: v })}
                  placeholder="Selecione o aluno"
                  options={alunoOptions}
                />
              </div>
            )}
            <div className="field full">
              <label>Status</label>
              {statusControladoPeloSistema ? (
                <>
                  <div className="field-readonly">{statusChromebook(editing).label}</div>
                  <div className="field-hint">
                    Este status é controlado automaticamente pelo {editing.status === 'emprestado' ? 'empréstimo' : 'registro de manutenção'} em aberto.
                  </div>
                </>
              ) : (
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="disponivel">{doAluno ? 'Com o aluno' : 'Disponível'}</option>
                  <option value="baixado">Baixado (fora de uso)</option>
                </select>
              )}
            </div>
            <div className="field full">
              <label>Observação</label>
              <textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}

      {fichaId && <FichaChromebook chromebookId={fichaId} onClose={() => setFichaId(null)} />}

      {deleting && (
        <ConfirmDialog
          title="Excluir Chromebook"
          message={`Tem certeza que deseja excluir o Chromebook "${deleting.numero_serie}"? Essa ação não pode ser desfeita.`}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          danger
        />
      )}
    </div>
  )
}
