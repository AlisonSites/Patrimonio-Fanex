import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { formatDate, patrimonioCodigo, todayISO } from '../lib/utils.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { FaEdit, FaTrash, FaExchangeAlt, FaArrowRight } from 'react-icons/fa'

const EMPTY_FORM = {
  patrimonio_id: '',
  data: todayISO(),
  unidade_destino_id: '',
  setor_destino_id: '',
  motivo: '',
}

export default function Movimentacao() {
  const [rows, setRows] = useState([])
  const [patrimonios, setPatrimonios] = useState([])
  const [unidades, setUnidades] = useState([])
  const [setores, setSetores] = useState([])

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
    const [movRes, patRes, uniRes, setRes] = await Promise.all([
      supabase
        .from('patrimonio_movimentacoes')
        .select('*, patrimonios(id,nome,modelo), unidade_origem:unidade_origem_id(id,nome), setor_origem:setor_origem_id(id,nome), unidade_destino:unidade_destino_id(id,nome), setor_destino:setor_destino_id(id,nome)')
        .order('data', { ascending: false }),
      supabase.from('patrimonios').select('id,nome,modelo,unidade_id,setor_id').order('nome'),
      supabase.from('unidades').select('*').eq('status', 'ativo').order('nome'),
      supabase.from('setores').select('*, unidades(id,nome)').eq('status', 'ativo').order('nome'),
    ])
    if (movRes.error) setError(movRes.error.message)
    else setRows(movRes.data || [])
    setPatrimonios(patRes.data || [])
    setUnidades(uniRes.data || [])
    setSetores(setRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const patrimonioSelecionado = useMemo(
    () => patrimonios.find((p) => String(p.id) === String(form.patrimonio_id)),
    [patrimonios, form.patrimonio_id]
  )

  const setoresDaUnidadeDestino = useMemo(() => {
    if (!form.unidade_destino_id) return setores
    return setores.filter((s) => String(s.unidade_id) === String(form.unidade_destino_id))
  }, [setores, form.unidade_destino_id])

  function openNew() {
    const primeiro = patrimonios[0]
    setForm({
      ...EMPTY_FORM,
      patrimonio_id: primeiro?.id || '',
      unidade_destino_id: primeiro?.unidade_id || '',
      setor_destino_id: primeiro?.setor_id || '',
    })
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    setForm({
      patrimonio_id: row.patrimonio_id,
      data: row.data || todayISO(),
      unidade_destino_id: row.unidade_destino_id || '',
      setor_destino_id: row.setor_destino_id || '',
      motivo: row.motivo || '',
    })
    setEditing(row)
    setModalOpen(true)
  }

  function handlePatrimonioChange(id) {
    const p = patrimonios.find((item) => String(item.id) === String(id))
    setForm({
      ...form,
      patrimonio_id: id,
      unidade_destino_id: p?.unidade_id || '',
      setor_destino_id: p?.setor_id || '',
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const origemUnidade = patrimonioSelecionado?.unidade_id || null
      const origemSetor = patrimonioSelecionado?.setor_id || null

      const payload = {
        patrimonio_id: form.patrimonio_id || null,
        data: form.data || null,
        unidade_origem_id: editing ? editing.unidade_origem_id : origemUnidade,
        setor_origem_id: editing ? editing.setor_origem_id : origemSetor,
        unidade_destino_id: form.unidade_destino_id || null,
        setor_destino_id: form.setor_destino_id || null,
        motivo: form.motivo || null,
      }

      let err
      if (editing) {
        ;({ error: err } = await supabase.from('patrimonio_movimentacoes').update(payload).eq('id', editing.id))
      } else {
        ;({ error: err } = await supabase.from('patrimonio_movimentacoes').insert(payload))
      }
      if (err) throw err

      // Atualiza a ficha do patrimônio com a nova unidade/setor
      const { error: updErr } = await supabase
        .from('patrimonios')
        .update({ unidade_id: form.unidade_destino_id || null, setor_id: form.setor_destino_id || null })
        .eq('id', form.patrimonio_id)
      if (updErr) throw updErr

      setModalOpen(false)
      load()
    } catch (err) {
      setError(err.message || 'Erro ao salvar movimentação')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const { error: err } = await supabase.from('patrimonio_movimentacoes').delete().eq('id', deleting.id)
    if (err) { setError(err.message); setDeleting(null); return }
    setDeleting(null)
    load()
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const nomePatrimonio = r.patrimonios?.nome || ''
      const matchesSearch = search
        ? [nomePatrimonio, r.motivo].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
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
            <input className="search-input" placeholder="Buscar por patrimônio, motivo..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="filter-select" value={patrimonioFilter} onChange={(e) => setPatrimonioFilter(e.target.value)}>
              <option value="todos">Todos os patrimônios</option>
              {patrimonios.map((p) => <option key={p.id} value={p.id}>{patrimonioCodigo(p.id)} — {p.nome}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={openNew} disabled={patrimonios.length === 0}>+ Nova Movimentação</button>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon"><FaExchangeAlt /></div>Nenhuma movimentação encontrada.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patrimônio</th><th>Data</th><th>De</th><th></th><th>Para</th><th>Motivo</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{patrimonioCodigo(row.patrimonio_id)} — {row.patrimonios?.nome || '-'}</td>
                    <td>{formatDate(row.data)}</td>
                    <td>{row.unidade_origem?.nome || '-'} / {row.setor_origem?.nome || '-'}</td>
                    <td><FaArrowRight /></td>
                    <td>{row.unidade_destino?.nome || '-'} / {row.setor_destino?.nome || '-'}</td>
                    <td>{row.motivo || '-'}</td>
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
          title={editing ? 'Editar Movimentação' : 'Nova Movimentação'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" form="movimentacao-form" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="movimentacao-form" className="form-grid" onSubmit={handleSave}>
            <div className="field full">
              <label>Patrimônio *</label>
              <select
                required
                value={form.patrimonio_id}
                onChange={(e) => handlePatrimonioChange(e.target.value)}
                disabled={!!editing}
              >
                <option value="" disabled>Selecione o patrimônio</option>
                {patrimonios.map((p) => <option key={p.id} value={p.id}>{patrimonioCodigo(p.id)} — {p.nome} ({p.modelo})</option>)}
              </select>
            </div>

            <div className="field full">
              <label>Localização Atual</label>
              <div className="field-readonly">
                {patrimonioSelecionado
                  ? `${unidades.find((u) => String(u.id) === String(patrimonioSelecionado.unidade_id))?.nome || 'Sem unidade'} / ${setores.find((s) => String(s.id) === String(patrimonioSelecionado.setor_id))?.nome || 'Sem setor'}`
                  : 'Selecione um patrimônio'}
              </div>
            </div>

            <div className="field">
              <label>Data da Movimentação *</label>
              <input required type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
            <div className="field" />

            <div className="field">
              <label>Nova Unidade *</label>
              <select
                required
                value={form.unidade_destino_id}
                onChange={(e) => setForm({ ...form, unidade_destino_id: e.target.value, setor_destino_id: '' })}
              >
                <option value="" disabled>Selecione a unidade</option>
                {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Novo Setor *</label>
              <select
                required
                value={form.setor_destino_id}
                onChange={(e) => setForm({ ...form, setor_destino_id: e.target.value })}
              >
                <option value="" disabled>Selecione o setor</option>
                {setoresDaUnidadeDestino.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>

            <div className="field full">
              <label>Motivo / Observação</label>
              <textarea value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir Movimentação"
          message="Tem certeza que deseja excluir este registro de movimentação? Essa ação não pode ser desfeita e não reverte a localização atual do patrimônio."
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          danger
        />
      )}
    </div>
  )
}
