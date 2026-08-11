import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { formatDate, patrimonioCodigo, todayISO } from '../lib/utils.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { FaEdit, FaTrash, FaExclamationTriangle } from 'react-icons/fa'

const EMPTY_FORM = {
  patrimonio_id: '',
  data: todayISO(),
  motivo: '',
  observacao: '',
}

export default function Quebrado() {
  const [rows, setRows] = useState([])
  const [patrimonios, setPatrimonios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [patrimonioFilter, setPatrimonioFilter] = useState('todos')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    const [quebRes, patRes] = await Promise.all([
      supabase
        .from('patrimonio_quebrados')
        .select('*, patrimonios(id,nome,modelo,status)')
        .order('data', { ascending: false }),
      supabase.from('patrimonios').select('id,nome,modelo,status').order('nome'),
    ])
    if (quebRes.error) setError(quebRes.error.message)
    else setRows(quebRes.data || [])
    setPatrimonios(patRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ ...EMPTY_FORM, patrimonio_id: patrimonios[0]?.id || '' })
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    setForm({
      patrimonio_id: row.patrimonio_id,
      data: row.data || todayISO(),
      motivo: row.motivo || '',
      observacao: row.observacao || '',
    })
    setEditing(row)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      patrimonio_id: form.patrimonio_id || null,
      data: form.data || null,
      motivo: form.motivo || null,
      observacao: form.observacao || null,
    }
    let err
    if (editing) {
      ;({ error: err } = await supabase.from('patrimonio_quebrados').update(payload).eq('id', editing.id))
    } else {
      ;({ error: err } = await supabase.from('patrimonio_quebrados').insert(payload))
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    load()
  }

  async function handleDelete() {
    // Ao excluir, o banco reativa o patrimônio automaticamente (trigger),
    // caso não haja outro registro de quebra apontando para ele.
    const { error: err } = await supabase.from('patrimonio_quebrados').delete().eq('id', deleting.id)
    if (err) { setError(err.message); setDeleting(null); return }
    setDeleting(null)
    load()
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const nomePatrimonio = r.patrimonios?.nome || ''
      const matchesSearch = search
        ? [nomePatrimonio, r.motivo, r.observacao].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
        : true
      const matchesPatrimonio = patrimonioFilter === 'todos' ? true : String(r.patrimonio_id) === String(patrimonioFilter)
      return matchesSearch && matchesPatrimonio
    })
  }, [rows, search, patrimonioFilter])

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="alert alert-info">
        Ao registrar aqui, o patrimônio é marcado como <strong>Inativo</strong> automaticamente.
        Se você excluir o registro, o patrimônio volta a ficar <strong>Ativo</strong>.
      </div>

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <input className="search-input" placeholder="Buscar por patrimônio, motivo, observação..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="filter-select" value={patrimonioFilter} onChange={(e) => setPatrimonioFilter(e.target.value)}>
              <option value="todos">Todos os patrimônios</option>
              {patrimonios.map((p) => <option key={p.id} value={p.id}>{patrimonioCodigo(p.id)} — {p.nome}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={openNew} disabled={patrimonios.length === 0}>+ Registrar Quebra</button>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon"><FaExclamationTriangle /></div>Nenhum registro de quebra encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patrimônio</th><th>Data</th><th>Motivo</th><th>Observação</th><th>Status do Patrimônio</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{patrimonioCodigo(row.patrimonio_id)} — {row.patrimonios?.nome || '-'}</td>
                    <td>{formatDate(row.data)}</td>
                    <td>{row.motivo || '-'}</td>
                    <td>{row.observacao || '-'}</td>
                    <td><StatusBadge status={row.patrimonios?.status} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" title="Editar" onClick={() => openEdit(row)}><FaEdit /></button>
                        <button className="icon-btn danger" title="Excluir (reativa o patrimônio)" onClick={() => setDeleting(row)}><FaTrash /></button>
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
          title={editing ? 'Editar Registro de Quebra' : 'Registrar Quebra de Patrimônio'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" form="quebrado-form" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="quebrado-form" className="form-grid" onSubmit={handleSave}>
            <div className="field full">
              <label>Patrimônio *</label>
              <select required value={form.patrimonio_id} onChange={(e) => setForm({ ...form, patrimonio_id: e.target.value })}>
                <option value="" disabled>Selecione o patrimônio</option>
                {patrimonios.map((p) => <option key={p.id} value={p.id}>{patrimonioCodigo(p.id)} — {p.nome} ({p.modelo})</option>)}
              </select>
            </div>
            <div className="field">
              <label>Data da Quebra *</label>
              <input required type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
            <div className="field">
              <label>Motivo</label>
              <input placeholder="Ex: Queda, mau uso, desgaste..." value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
            </div>
            <div className="field full">
              <label>Observação</label>
              <textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir Registro de Quebra"
          message="Tem certeza que deseja excluir este registro? O patrimônio voltará a ficar ativo (se não houver outro registro de quebra para ele)."
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          danger
        />
      )}
    </div>
  )
}
