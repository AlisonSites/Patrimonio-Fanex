import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import { FaEdit, FaTrash, FaInbox } from 'react-icons/fa'

function formatarCpf(valor) {
  const digitos = (valor || '').replace(/\D/g, '').slice(0, 11)
  return digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export default function Usuario() {
  const [rows, setRows] = useState([])
  const [perfis, setPerfis] = useState([])
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
      .from('usuarios')
      .select('id, nome, cpf, status, criado_em, perfil_id, perfis(nome)')
      .order('criado_em', { ascending: false })
    if (err) setError(err.message)
    else setRows(data || [])
    setLoading(false)
  }

  async function loadPerfis() {
    const { data } = await supabase
      .from('perfis')
      .select('id, nome')
      .eq('status', 'ativo')
      .order('nome', { ascending: true })
    setPerfis(data || [])
  }

  useEffect(() => { load(); loadPerfis() }, [])

  function openNew() {
    setForm({ nome: '', cpf: '', senha: '', status: 'ativo', perfil_id: '' })
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    setForm({
      nome: row.nome,
      cpf: formatarCpf(row.cpf),
      senha: '',
      status: row.status,
      perfil_id: row.perfil_id || '',
    })
    setEditing(row)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const cpfLimpo = (form.cpf || '').replace(/\D/g, '')
    if (!form.nome?.trim() || cpfLimpo.length !== 11) {
      setError('Preencha nome e um CPF válido.')
      setSaving(false)
      return
    }
    if (!editing && !form.senha) {
      setError('Defina uma senha para o novo usuário.')
      setSaving(false)
      return
    }
    if (!form.perfil_id) {
      setError('Selecione um perfil de acesso.')
      setSaving(false)
      return
    }

    let err
    if (editing) {
      const payload = {
        nome: form.nome.trim(),
        cpf: cpfLimpo,
        status: form.status || 'ativo',
        perfil_id: form.perfil_id,
      }
      if (form.senha) payload.senha = form.senha
      ;({ error: err } = await supabase.from('usuarios').update(payload).eq('id', editing.id))
    } else {
      ;({ error: err } = await supabase.from('usuarios').insert({
        nome: form.nome.trim(),
        cpf: cpfLimpo,
        senha: form.senha,
        status: form.status || 'ativo',
        perfil_id: form.perfil_id,
      }))
    }
    setSaving(false)
    if (err) {
      setError(err.message.includes('duplicate') ? 'Já existe um usuário com esse CPF.' : err.message)
      return
    }
    setModalOpen(false)
    load()
  }

  async function handleDelete() {
    const { error: err } = await supabase.from('usuarios').delete().eq('id', deleting.id)
    if (err) { setError(err.message); setDeleting(null); return }
    setDeleting(null)
    load()
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch = search
        ? (r.nome || '').toLowerCase().includes(search.toLowerCase()) || (r.cpf || '').includes(search.replace(/\D/g, ''))
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
            <input className="search-input" placeholder="Buscar por nome ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={openNew}>+ Novo Usuário</button>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon"><FaInbox /></div>Nenhum usuário encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Nome</th><th>CPF</th><th>Perfil</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{row.nome}</td>
                    <td>{formatarCpf(row.cpf)}</td>
                    <td>{row.perfis?.nome || '-'}</td>
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
          title={editing ? 'Editar Usuário' : 'Novo Usuário'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" form="usuario-form" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="usuario-form" className="form-grid" onSubmit={handleSave}>
            <div className="field full">
              <label>Nome *</label>
              <input required value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="field">
              <label>CPF *</label>
              <input
                required
                inputMode="numeric"
                maxLength={14}
                placeholder="000.000.000-00"
                value={form.cpf || ''}
                onChange={(e) => setForm({ ...form, cpf: formatarCpf(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Senha {editing && '(deixe em branco para manter)'}</label>
              <PasswordInput
                placeholder="••••••••"
                value={form.senha || ''}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Perfil de Acesso *</label>
              <select
                required
                value={form.perfil_id || ''}
                onChange={(e) => setForm({ ...form, perfil_id: e.target.value })}
              >
                <option value="">Selecione...</option>
                {perfis.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div className="field">
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
          title="Excluir Usuário"
          message={`Tem certeza que deseja excluir o usuário "${deleting.nome}"? Essa ação não pode ser desfeita.`}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          danger
        />
      )}
    </div>
  )
}