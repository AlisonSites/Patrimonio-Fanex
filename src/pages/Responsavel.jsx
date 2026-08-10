import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { codigoGenerico } from '../lib/utils.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { FaEdit, FaTrash, FaInbox } from 'react-icons/fa'

export default function Responsavel() {
  const [rows, setRows] = useState([])
  const [setores, setSetores] = useState([])
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
    const [respRes, setoresRes] = await Promise.all([
      supabase.from('responsaveis').select('*, setores(id, nome, unidades(id, nome))').order('id'),
      supabase.from('setores').select('*, unidades(id, nome)').eq('status', 'ativo').order('nome'),
    ])
    if (respRes.error) setError(respRes.error.message)
    else setRows(respRes.data || [])
    setSetores(setoresRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ nome: '', setor_id: setores[0]?.id || '', status: 'ativo' })
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    setForm({ nome: row.nome, setor_id: row.setor_id, status: row.status })
    setEditing(row)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      nome: form.nome,
      setor_id: form.setor_id || null,
      status: form.status || 'ativo',
    }
    let err
    if (editing) {
      ;({ error: err } = await supabase.from('responsaveis').update(payload).eq('id', editing.id))
    } else {
      ;({ error: err } = await supabase.from('responsaveis').insert(payload))
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    load()
  }

  async function handleDelete() {
    const { error: err } = await supabase.from('responsaveis').delete().eq('id', deleting.id)
    if (err) { setError(err.message); setDeleting(null); return }
    setDeleting(null)
    load()
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch = search
        ? (r.nome || '').toLowerCase().includes(search.toLowerCase()) ||
          (r.setores?.nome || '').toLowerCase().includes(search.toLowerCase())
        : true
      const matchesStatus = statusFilter === 'todos' ? true : r.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [rows, search, statusFilter])

  const unidadeAutomatica = useMemo(() => {
    const setor = setores.find((s) => String(s.id) === String(form.setor_id))
    return setor?.unidades?.nome || '-'
  }, [setores, form.setor_id])

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <input className="search-input" placeholder="Buscar responsável..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={openNew}>+ Novo Responsável</button>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon"><FaInbox /></div>Nenhum responsável encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Nome do Responsável</th><th>Setor</th><th>Unidade</th><th>Status</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{codigoGenerico('RESP', row.id)}</td>
                    <td>{row.nome}</td>
                    <td>{row.setores?.nome || '-'}</td>
                    <td>{row.setores?.unidades?.nome || '-'}</td>
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
          title={editing ? 'Editar Responsável' : 'Novo Responsável'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" form="resp-form" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="resp-form" className="form-grid" onSubmit={handleSave}>
            {editing && (
              <div className="field full">
                <label>ID</label>
                <div className="field-readonly">{codigoGenerico('RESP', editing.id)}</div>
              </div>
            )}
            <div className="field full">
              <label>Nome do Responsável *</label>
              <input required value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="field full">
              <label>Setor *</label>
              <select required value={form.setor_id || ''} onChange={(e) => setForm({ ...form, setor_id: e.target.value })}>
                <option value="" disabled>Selecione o setor</option>
                {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div className="field full">
              <label>Unidade (automática)</label>
              <div className="field-readonly">{unidadeAutomatica}</div>
              <small className="hint">Preenchida automaticamente a partir do setor selecionado.</small>
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
          title="Excluir Responsável"
          message="Tem certeza que deseja excluir este responsável? Essa ação não pode ser desfeita."
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          danger
        />
      )}
    </div>
  )
}
