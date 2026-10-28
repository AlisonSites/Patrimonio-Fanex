import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { TURNOS, turmaCodigo } from '../../lib/chromebook.js'
import { usePodeEditar } from '../../lib/permissoes.js'
import Modal from '../../components/Modal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { FaEdit, FaTrash, FaChalkboardTeacher } from 'react-icons/fa'

const ANO_ATUAL = new Date().getFullYear()

const EMPTY_FORM = { nome: '', unidade_id: '', ano_letivo: ANO_ATUAL, turno: '', status: 'ativo' }

export default function Turmas() {
  const podeEditar = usePodeEditar()
  const [rows, setRows] = useState([])
  const [unidades, setUnidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [anoFilter, setAnoFilter] = useState(String(ANO_ATUAL))
  const [unidadeFilter, setUnidadeFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('ativo')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    const [turmasRes, unidadesRes] = await Promise.all([
      supabase.from('turmas').select('*, unidades(id,nome), alunos(count)').order('ano_letivo', { ascending: false }).order('nome'),
      supabase.from('unidades').select('id,nome').eq('status', 'ativo').order('nome'),
    ])
    if (turmasRes.error) setError(turmasRes.error.message)
    else setRows(turmasRes.data || [])
    setUnidades(unidadesRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ ...EMPTY_FORM, unidade_id: unidades.length === 1 ? unidades[0].id : '' })
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    setForm({
      nome: row.nome,
      unidade_id: row.unidade_id || '',
      ano_letivo: row.ano_letivo,
      turno: row.turno || '',
      status: row.status,
    })
    setEditing(row)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      nome: form.nome.trim(),
      unidade_id: form.unidade_id || null,
      ano_letivo: Number(form.ano_letivo) || ANO_ATUAL,
      turno: form.turno || null,
      status: form.status || 'ativo',
    }
    let err
    if (editing) {
      ;({ error: err } = await supabase.from('turmas').update(payload).eq('id', editing.id))
    } else {
      ;({ error: err } = await supabase.from('turmas').insert(payload))
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    load()
  }

  async function handleDelete() {
    const { error: err } = await supabase.from('turmas').delete().eq('id', deleting.id)
    if (err) { setError(err.message); setDeleting(null); return }
    setDeleting(null)
    load()
  }

  const anos = useMemo(() => {
    const set = new Set(rows.map((r) => r.ano_letivo))
    set.add(ANO_ATUAL)
    return Array.from(set).sort((a, b) => b - a)
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch = search ? (r.nome || '').toLowerCase().includes(search.toLowerCase()) : true
      const matchesAno = anoFilter === 'todos' ? true : String(r.ano_letivo) === anoFilter
      const matchesUnidade = unidadeFilter === 'todos' ? true : String(r.unidade_id) === unidadeFilter
      const matchesStatus = statusFilter === 'todos' ? true : r.status === statusFilter
      return matchesSearch && matchesAno && matchesUnidade && matchesStatus
    })
  }, [rows, search, anoFilter, unidadeFilter, statusFilter])

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <input className="search-input" placeholder="Buscar turma..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="filter-select" value={anoFilter} onChange={(e) => setAnoFilter(e.target.value)}>
              <option value="todos">Todos os anos</option>
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select className="filter-select" value={unidadeFilter} onChange={(e) => setUnidadeFilter(e.target.value)}>
              <option value="todos">Todas as unidades</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          {podeEditar && <button className="btn btn-primary" onClick={openNew}>+ Nova Turma</button>}
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon"><FaChalkboardTeacher /></div>Nenhuma turma encontrada.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>ID</th><th>Turma</th><th>Unidade</th><th>Ano Letivo</th><th>Turno</th><th>Alunos</th><th>Status</th>{podeEditar && <th>Ações</th>}</tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{turmaCodigo(row.id)}</td>
                    <td>{row.nome}</td>
                    <td>{row.unidades?.nome || '-'}</td>
                    <td>{row.ano_letivo}</td>
                    <td>{TURNOS[row.turno] || '-'}</td>
                    <td>{row.alunos?.[0]?.count ?? 0}</td>
                    <td><StatusBadge status={row.status} /></td>
                    {podeEditar && (
                      <td>
                        <div className="row-actions">
                          <button className="icon-btn" title="Editar" onClick={() => openEdit(row)}><FaEdit /></button>
                          <button className="icon-btn danger" title="Excluir" onClick={() => setDeleting(row)}><FaTrash /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="pagination"><span>{filtered.length} registro(s)</span></div>
      </div>

      {modalOpen && (
        <Modal
          title={editing ? 'Editar Turma' : 'Nova Turma'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" form="turma-form" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="turma-form" className="form-grid" onSubmit={handleSave}>
            <div className="field full">
              <label>Nome da Turma *</label>
              <input required placeholder="Ex: 6º Ano A" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="field">
              <label>Unidade</label>
              <select value={form.unidade_id} onChange={(e) => setForm({ ...form, unidade_id: e.target.value })}>
                <option value="">Não informada</option>
                {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Ano Letivo *</label>
              <input required type="number" min="2000" max="2100" value={form.ano_letivo} onChange={(e) => setForm({ ...form, ano_letivo: e.target.value })} />
            </div>
            <div className="field">
              <label>Turno</label>
              <select value={form.turno} onChange={(e) => setForm({ ...form, turno: e.target.value })}>
                <option value="">Não informado</option>
                {Object.entries(TURNOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir Turma"
          message={`Tem certeza que deseja excluir a turma "${deleting.nome}"? Os alunos dela ficarão sem turma.`}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          danger
        />
      )}
    </div>
  )
}
