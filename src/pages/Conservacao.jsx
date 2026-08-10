import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { formatCurrency, formatDate, patrimonioCodigo, todayISO } from '../lib/utils.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { FaEdit, FaTrash, FaInbox, FaHeartbeat } from 'react-icons/fa'

const ESTADOS = ['Ótimo', 'Bom', 'Regular', 'Ruim', 'Inservível']

const EMPTY_FORM = {
  patrimonio_id: '',
  data: todayISO(),
  valor: '',
  estado_conservacao: 'Bom',
  observacao: '',
}

export default function Conservacao() {
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
    const [consRes, patRes] = await Promise.all([
      supabase
        .from('patrimonio_conservacoes')
        .select('*, patrimonios(id,nome,modelo)')
        .order('data', { ascending: false }),
      supabase.from('patrimonios').select('id,nome,modelo').order('nome'),
    ])
    if (consRes.error) setError(consRes.error.message)
    else setRows(consRes.data || [])
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
      valor: row.valor ?? '',
      estado_conservacao: row.estado_conservacao || 'Bom',
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
      valor: form.valor === '' ? null : Number(form.valor),
      estado_conservacao: form.estado_conservacao || null,
      observacao: form.observacao || null,
    }
    let err
    if (editing) {
      ;({ error: err } = await supabase.from('patrimonio_conservacoes').update(payload).eq('id', editing.id))
    } else {
      ;({ error: err } = await supabase.from('patrimonio_conservacoes').insert(payload))
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    load()
  }

  async function handleDelete() {
    const { error: err } = await supabase.from('patrimonio_conservacoes').delete().eq('id', deleting.id)
    if (err) { setError(err.message); setDeleting(null); return }
    setDeleting(null)
    load()
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const nomePatrimonio = r.patrimonios?.nome || ''
      const matchesSearch = search
        ? [nomePatrimonio, r.observacao, r.estado_conservacao].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
        : true
      const matchesPatrimonio = patrimonioFilter === 'todos' ? true : String(r.patrimonio_id) === String(patrimonioFilter)
      return matchesSearch && matchesPatrimonio
    })
  }, [rows, search, patrimonioFilter])

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <input className="search-input" placeholder="Buscar por patrimônio, estado, observação..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="filter-select" value={patrimonioFilter} onChange={(e) => setPatrimonioFilter(e.target.value)}>
              <option value="todos">Todos os patrimônios</option>
              {patrimonios.map((p) => <option key={p.id} value={p.id}>{patrimonioCodigo(p.id)} — {p.nome}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={openNew} disabled={patrimonios.length === 0}>+ Novo Registro</button>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon"><FaHeartbeat /></div>Nenhum registro de conservação encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patrimônio</th><th>Data</th><th>Valor</th><th>Estado de Conservação</th><th>Observação</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{patrimonioCodigo(row.patrimonio_id)} — {row.patrimonios?.nome || '-'}</td>
                    <td>{formatDate(row.data)}</td>
                    <td>{formatCurrency(row.valor)}</td>
                    <td>{row.estado_conservacao || '-'}</td>
                    <td>{row.observacao || '-'}</td>
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
          title={editing ? 'Editar Registro de Conservação' : 'Novo Registro de Conservação'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" form="conservacao-form" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="conservacao-form" className="form-grid" onSubmit={handleSave}>
            <div className="field full">
              <label>Patrimônio *</label>
              <select required value={form.patrimonio_id} onChange={(e) => setForm({ ...form, patrimonio_id: e.target.value })}>
                <option value="" disabled>Selecione o patrimônio</option>
                {patrimonios.map((p) => <option key={p.id} value={p.id}>{patrimonioCodigo(p.id)} — {p.nome} ({p.modelo})</option>)}
              </select>
            </div>
            <div className="field">
              <label>Data *</label>
              <input required type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
            <div className="field">
              <label>Valor Atual</label>
              <input type="number" step="0.01" min="0" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </div>
            <div className="field full">
              <label>Estado de Conservação</label>
              <select value={form.estado_conservacao} onChange={(e) => setForm({ ...form, estado_conservacao: e.target.value })}>
                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
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
          title="Excluir Registro de Conservação"
          message="Tem certeza que deseja excluir este registro? Essa ação não pode ser desfeita."
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          danger
        />
      )}
    </div>
  )
}
