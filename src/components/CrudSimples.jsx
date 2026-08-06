import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { codigoGenerico } from '../lib/utils.js'
import Modal from './Modal.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import StatusBadge from './StatusBadge.jsx'

/**
 * CRUD simples e configurável, usado nas telas de Tipo, Unidade e Fornecedor.
 *
 * fields: [{ key, label, type: 'text', required }]
 */
export default function CrudSimples({ table, entityLabel, codePrefix, fields }) {
  const [rows, setRows] = useState([])
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
    const { data, error: err } = await supabase.from(table).select('*').order('id', { ascending: true })
    if (err) setError(err.message)
    else setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    const initial = { status: 'ativo' }
    fields.forEach((f) => { initial[f.key] = '' })
    setForm(initial)
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    setForm({ ...row })
    setEditing(row)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {}
    fields.forEach((f) => { payload[f.key] = form[f.key] })
    payload.status = form.status || 'ativo'

    let err
    if (editing) {
      ;({ error: err } = await supabase.from(table).update(payload).eq('id', editing.id))
    } else {
      ;({ error: err } = await supabase.from(table).insert(payload))
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    load()
  }

  async function handleDelete() {
    const { error: err } = await supabase.from(table).delete().eq('id', deleting.id)
    if (err) { setError(err.message); setDeleting(null); return }
    setDeleting(null)
    load()
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch = search
        ? Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(search.toLowerCase()))
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
            <input
              className="search-input"
              placeholder={`Buscar ${entityLabel.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={openNew}>+ Novo {entityLabel}</button>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">□</div>
              Nenhum registro encontrado.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  {fields.map((f) => <th key={f.key}>{f.label}</th>)}
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{codigoGenerico(codePrefix, row.id)}</td>
                    {fields.map((f) => <td key={f.key}>{row[f.key]}</td>)}
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
        <div className="pagination">
          <span>{filtered.length} registro(s)</span>
        </div>
      </div>

      {modalOpen && (
        <Modal
          title={editing ? `Editar ${entityLabel}` : `Novo ${entityLabel}`}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" form="crud-form" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="crud-form" className="form-grid" onSubmit={handleSave}>
            {editing && (
              <div className="field full">
                <label>ID</label>
                <div className="field-readonly">{codigoGenerico(codePrefix, editing.id)}</div>
              </div>
            )}
            {fields.map((f) => (
              <div className="field full" key={f.key}>
                <label>{f.label}{f.required && ' *'}</label>
                <input
                  type="text"
                  required={f.required}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </div>
            ))}
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
          title={`Excluir ${entityLabel}`}
          message={`Tem certeza que deseja excluir este registro? Essa ação não pode ser desfeita.`}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          danger
        />
      )}
    </div>
  )
}
