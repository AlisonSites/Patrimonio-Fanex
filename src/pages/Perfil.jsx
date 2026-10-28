import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { FaEdit, FaTrash, FaInbox } from 'react-icons/fa'
import { MODULOS } from '../lib/modulos.jsx'
import { NIVEIS } from '../lib/permissoes.js'
import { usePodeEditar } from '../lib/permissoes.js'

export default function Perfil() {
  const podeEditar = usePodeEditar()
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
      .select('id, nome, descricao, is_admin, permissoes, status, created_at')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ nome: '', descricao: '', is_admin: false, permissoes: {}, status: 'ativo' })
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    setForm({ ...row, permissoes: row.permissoes || {} })
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
      permissoes: form.permissoes || {},
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
          {podeEditar && <button className="btn btn-primary" onClick={openNew}>+ Novo Perfil</button>}
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon"><FaInbox /></div>Nenhum perfil encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Nome</th><th>Descrição</th><th>Acesso</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{row.nome}</td>
                    <td>{row.descricao || '-'}</td>
                    <td>{resumoAcesso(row)}</td>
                    <td><StatusBadge status={row.status} /></td>
                    <td>
                      <div className="row-actions">
                        {podeEditar && <button className="icon-btn" title="Editar" onClick={() => openEdit(row)}><FaEdit /></button>}
                        {podeEditar && <button className="icon-btn danger" title="Excluir" onClick={() => setDeleting(row)}><FaTrash /></button>}
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
          maxWidth={820}
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
                Acesso total a todos os módulos e páginas, inclusive usuários e perfis.
              </div>
            </div>
            {!form.is_admin && (
              <div className="field full">
                <label>Permissões por página</label>
                <PermissoesEditor
                  value={form.permissoes || {}}
                  onChange={(permissoes) => setForm({ ...form, permissoes })}
                />
              </div>
            )}
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

// Texto curto da coluna "Acesso": módulos liberados para o perfil
function resumoAcesso(perfil) {
  if (perfil.is_admin) return 'Administrador (total)'
  const permissoes = perfil.permissoes || {}
  const modulos = MODULOS.filter((m) => m.paginas.some((p) => permissoes[p.chave]))
  return modulos.length ? modulos.map((m) => m.label).join(', ') : 'Nenhum'
}

// Matriz de permissões: para cada página, Sem acesso / Visualizar / Editar
function PermissoesEditor({ value, onChange }) {
  function setNivel(chave, nivel) {
    const novo = { ...value }
    if (nivel) novo[chave] = nivel
    else delete novo[chave]
    onChange(novo)
  }

  function setModulo(modulo, nivel) {
    const novo = { ...value }
    modulo.paginas.forEach((p) => {
      const n = nivel === 'editar' && p.somenteVer ? 'ver' : nivel
      if (n) novo[p.chave] = n
      else delete novo[p.chave]
    })
    onChange(novo)
  }

  return (
    <div className="permissoes">
      {MODULOS.map((m) => (
        <div key={m.key} className="permissoes-modulo">
          <div className="permissoes-modulo-header">
            <span className="permissoes-modulo-titulo">{m.icon} {m.label}</span>
            <div className="permissoes-atalhos">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModulo(m, '')}>Nenhum</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModulo(m, 'ver')}>Tudo visualizar</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModulo(m, 'editar')}>Tudo editar</button>
            </div>
          </div>
          {m.paginas.map((p) => (
            <div key={p.chave} className="permissoes-linha">
              <span>{p.label}</span>
              <div className="permissoes-niveis">
                {NIVEIS.filter((n) => !(p.somenteVer && n.value === 'editar')).map((n) => (
                  <label key={n.value} className={`permissoes-nivel ${(value[p.chave] || '') === n.value ? 'ativo' : ''}`}>
                    <input
                      type="radio"
                      name={`perm-${p.chave}`}
                      checked={(value[p.chave] || '') === n.value}
                      onChange={() => setNivel(p.chave, n.value)}
                    />
                    {n.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
      <div className="field-hint">
        <strong>Visualizar</strong>: só consulta. <strong>Editar</strong>: pode incluir, alterar e excluir.
        O card do módulo aparece na tela inicial quando o perfil tem acesso a pelo menos uma página dele.
      </div>
    </div>
  )
}
