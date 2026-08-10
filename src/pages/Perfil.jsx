import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { FaEdit, FaTrash, FaInbox } from 'react-icons/fa'

export default function Perfil() {
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
    const { data, error: err } = await supabase
      .from('perfis')
      .select('id, nome, descricao, is_admin, status, created_at')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ nome: '', descricao: '', is_admin: false, status: 'ativo' })
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

    if (!form.nome?.trim()) {
      setError('Informe o nome do perfil.')
      setSaving(false)
      return
    }

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao?.trim() || null,
      is_admin: !!form.is_admin,
      status: form.status || 'ativo',
    }

    let err
    if (editing) {
      ;({ error: err } = await supabase.from('perfis').update(payload).eq('id', editing.id))
    } else {
      ;({ error: err } = await supabase.from('perfis').insert(payload))
    }
    setSaving(false)
    if (err) {
      setError(err.message.includes('duplicate') ? 'Já existe um perfil com esse nome.' : err.message)
      return
    }
    setModalOpen(false)
    load()
  }

  async function handleDelete() {
    const { error: err } = await supabase.from('perfis').delete().eq('id', deleting.id)
    if (err) {
      setError(
        err.message.includes('foreign key')
          ? 'Este perfil está vinculado a usuários e não pode ser excluído.'
          : err.message
      )
      setDeleting(null)
      return
    }
    setDeleting(null)
    load()
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch = search
        ? (r.nome || '').toLowerCase().includes(search.toLowerCase())
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
              placeholder="Buscar por nome do perfil..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={openNew}>+ Novo Perfil</button>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon"><FaInbox /></div>Nenhum perfil encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Nome</th><th>Descrição</th><th>Administrador</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{row.nome}</td>
                    <td>{row.descricao || '-'}</td>
                    <td>{row.is_admin ? 'Sim' : 'Não'}</td>
                    <td><StatusBadge status={row.status} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" title="Editar" onClick={() => openEdit(row)}><FaEdit /></button>
                        <button className="icon-btn danger" title="Excluir" onClick={() => setDeleting(row)}><FaTrash /></button>
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
          title={editing ? 'Editar Perfil' : 'Novo Perfil'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" form="perfil-form" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="perfil-form" className="form-grid" onSubmit={handleSave}>
            <div className="field full">
              <label>Nome *</label>
              <input
                required
                placeholder="Ex: Administrador, Financeiro..."
                value={form.nome || ''}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="field full">
              <label>Descrição</label>
              <input
                placeholder="Para que serve este perfil"
                value={form.descricao || ''}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            <div className="field full">
              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={!!form.is_admin}
                  onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
                />
                Perfil de administrador
              </label>
              <div className="field-hint">
                Usuários com este perfil podem cadastrar outros usuários e perfis de acesso.
              </div>
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
          title="Excluir Perfil"
          message={`Tem certeza que deseja excluir o perfil "${deleting.nome}"? Essa ação não pode ser desfeita.`}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          danger
        />
      )}
    </div>
  )
}
