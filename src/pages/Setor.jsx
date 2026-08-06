import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { codigoGenerico } from '../lib/utils.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

export default function Setor() {
  const [rows, setRows] = useState([])
  const [unidades, setUnidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    const [setoresRes, unidadesRes] = await Promise.all([
      supabase.from('setores').select('*, unidades(id, nome)').order('id'),
      supabase.from('unidades').select('*').eq('status', 'ativo').order('nome'),
    ])
    if (setoresRes.error) setError(setoresRes.error.message)
    else setRows(setoresRes.data || [])
    setUnidades(unidadesRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ nome: '', unidade_id: unidades[0]?.id || '', status: 'ativo' })
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    setForm({ nome: row.nome, unidade_id: row.unidade_id, status: row.status })
    setEditing(row)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      nome: form.nome,
      unidade_id: form.unidade_id || null,
      status: form.status || 'ativo',
    }
    let err
    if (editing) {
      ;({ error: err } = await supabase.from('setores').update(payload).eq('id', editing.id))
    } else {
      ;({ error: err } = await supabase.from('setores').insert(payload))
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    load()
  }

  async function handleDelete() {
    const { error: err } = await supabase.from('setores').delete().eq('id', deleting.id)
    if (err) { setError(err.message); setDeleting(null); return }
    setDeleting(null)
    load()
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch = search
        ? (r.nome || '').toLowerCase().includes(search.toLowerCase()) ||
          (r.unidades?.nome || '').toLowerCase().includes(search.toLowerCase())
        : true
      const matchesStatus = statusFilter === 'todos' ? true : r.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [rows, search, statusFilter])

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <input className="search-input" placeholder="Buscar setor..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={openNew}>+ Novo Setor</button>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon">□</div>Nenhum setor encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Nome do Setor</th><th>Unidade</th><th>Status</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{codigoGenerico('SET', row.id)}</td>
                    <td>{row.nome}</td>
                    <td>{row.unidades?.nome || '-'}</td>
                    <td><StatusBadge status={row.status} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" title="Editar" onClick={() => openEdit(row)}>✎</button>
                        <button className="icon-btn danger" title="Excluir" onClick={() => setDeleting(row)}>🗑</button>
                      </div>
                    </td>
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
          title={editing ? 'Editar Setor' : 'Novo Setor'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" form="setor-form" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="setor-form" className="form-grid" onSubmit={handleSave}>
            {editing && (
              <div className="field full">
                <label>ID</label>
                <div className="field-readonly">{codigoGenerico('SET', editing.id)}</div>
              </div>
            )}
            <div className="field full">
              <label>Nome do Setor *</label>
              <input required value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="field full">
              <label>Unidade *</label>
              <select required value={form.unidade_id || ''} onChange={(e) => setForm({ ...form, unidade_id: e.target.value })}>
                <option value="" disabled>Selecione a unidade</option>
                {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div className="field full">
              <label>Status</label>
              <select value={form.status || 'ativo'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir Setor"
          message="Tem certeza que deseja excluir este setor? Essa ação não pode ser desfeita."
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          danger
        />
      )}
    </div>
  )
}
