import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { cpfValido, formatarCpf, normalizarTexto } from '../../lib/utils.js'
import { STATUS_ALUNO, alunoCodigo, turmaLabel } from '../../lib/chromebook.js'
import { usePodeEditar } from '../../lib/permissoes.js'
import Modal from '../../components/Modal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import SearchableSelect from '../../components/SearchableSelect.jsx'
import Badge from '../../components/Badge.jsx'
import ImportarAlunos from './ImportarAlunos.jsx'
import { FaEdit, FaTrash, FaUserGraduate, FaFileImport } from 'react-icons/fa'

const EMPTY_FORM = { nome: '', cpf: '', matricula: '', turma_id: '', status: 'ativo' }

// Na listagem o CPF aparece parcialmente oculto (LGPD); completo só no formulário
function cpfMascarado(cpf) {
  if (!cpf) return '-'
  const f = formatarCpf(cpf)
  return `***.${f.slice(4, 7)}.${f.slice(8, 11)}-**`
}

export default function Alunos() {
  const podeEditar = usePodeEditar()
  const [rows, setRows] = useState([])
  const [turmas, setTurmas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [turmaFilter, setTurmaFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('ativo')
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    const [alunosRes, turmasRes] = await Promise.all([
      supabase
        .from('alunos')
        .select('*, turmas(id,nome,ano_letivo), chromebooks(id,numero_serie,status)')
        .order('nome'),
      supabase.from('turmas').select('id,nome,ano_letivo,status').order('ano_letivo', { ascending: false }).order('nome'),
    ])
    if (alunosRes.error) setError(alunosRes.error.message)
    else setRows(alunosRes.data || [])
    setTurmas(turmasRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    setForm({
      nome: row.nome,
      cpf: formatarCpf(row.cpf),
      matricula: row.matricula || '',
      turma_id: row.turma_id || '',
      status: row.status,
    })
    setEditing(row)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    const cpfLimpo = form.cpf.replace(/\D/g, '')
    if (cpfLimpo && !cpfValido(cpfLimpo)) {
      setError('CPF inválido. Confira os números ou deixe o campo em branco.')
      return
    }
    setSaving(true)
    const payload = {
      nome: form.nome.trim(),
      cpf: cpfLimpo || null,
      matricula: form.matricula.trim() || null,
      turma_id: form.turma_id || null,
      status: form.status || 'ativo',
    }
    let err
    if (editing) {
      ;({ error: err } = await supabase.from('alunos').update(payload).eq('id', editing.id))
    } else {
      ;({ error: err } = await supabase.from('alunos').insert(payload))
    }
    setSaving(false)
    if (err) {
      if (err.message.includes('alunos_cpf_key')) setError('Já existe um aluno com esse CPF.')
      else if (err.message.includes('alunos_matricula_key')) setError('Já existe um aluno com essa matrícula.')
      else setError(err.message)
      return
    }
    setModalOpen(false)
    load()
  }

  async function handleDelete() {
    const { error: err } = await supabase.from('alunos').delete().eq('id', deleting.id)
    if (err) {
      setError(
        err.message.includes('foreign key')
          ? 'Este aluno tem Chromebook ou empréstimos registrados e não pode ser excluído. Mude o status dele para "Transferido" ou "Inativo".'
          : err.message
      )
      setDeleting(null)
      return
    }
    setDeleting(null)
    load()
  }

  const turmaOptions = useMemo(
    () => turmas.filter((t) => t.status === 'ativo' || String(t.id) === String(form.turma_id))
      .map((t) => ({ value: t.id, label: turmaLabel(t) })),
    [turmas, form.turma_id]
  )

  const filtered = useMemo(() => {
    const termo = normalizarTexto(search)
    const termoDigitos = search.replace(/\D/g, '')
    return rows.filter((r) => {
      const matchesSearch = termo
        ? normalizarTexto(r.nome).includes(termo) ||
          normalizarTexto(r.matricula).includes(termo) ||
          (termoDigitos.length >= 3 && (r.cpf || '').includes(termoDigitos))
        : true
      const matchesTurma = turmaFilter === 'todos' ? true : turmaFilter === 'sem' ? !r.turma_id : String(r.turma_id) === turmaFilter
      const matchesStatus = statusFilter === 'todos' ? true : r.status === statusFilter
      return matchesSearch && matchesTurma && matchesStatus
    })
  }, [rows, search, turmaFilter, statusFilter])

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <input className="search-input" placeholder="Buscar por nome, matrícula ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <SearchableSelect
              variant="filter"
              value={turmaFilter}
              onChange={setTurmaFilter}
              options={[
                { value: 'todos', label: 'Todas as turmas' },
                { value: 'sem', label: 'Sem turma' },
                ...turmas.map((t) => ({ value: t.id, label: turmaLabel(t) })),
              ]}
            />
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todos">Todos os status</option>
              {Object.entries(STATUS_ALUNO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {podeEditar && (
            <div className="card-header-actions">
              <button className="btn btn-secondary" onClick={() => setImportOpen(true)}><FaFileImport /> Importar CSV</button>
              <button className="btn btn-primary" onClick={openNew}>+ Novo Aluno</button>
            </div>
          )}
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon"><FaUserGraduate /></div>Nenhum aluno encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>ID</th><th>Nome</th><th>Matrícula</th><th>CPF</th><th>Turma</th><th>Chromebook próprio</th><th>Status</th>{podeEditar && <th>Ações</th>}</tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const st = STATUS_ALUNO[row.status] || { label: row.status, tom: 'cinza' }
                  return (
                    <tr key={row.id}>
                      <td>{alunoCodigo(row.id)}</td>
                      <td>{row.nome}</td>
                      <td>{row.matricula || '-'}</td>
                      <td>{cpfMascarado(row.cpf)}</td>
                      <td>{turmaLabel(row.turmas)}</td>
                      <td>{row.chromebooks?.length ? row.chromebooks.map((c) => c.numero_serie).join(', ') : '-'}</td>
                      <td><Badge tom={st.tom}>{st.label}</Badge></td>
                      {podeEditar && (
                        <td>
                          <div className="row-actions">
                            <button className="icon-btn" title="Editar" onClick={() => openEdit(row)}><FaEdit /></button>
                            <button className="icon-btn danger" title="Excluir" onClick={() => setDeleting(row)}><FaTrash /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="pagination"><span>{filtered.length} registro(s)</span></div>
      </div>

      {modalOpen && (
        <Modal
          title={editing ? 'Editar Aluno' : 'Novo Aluno'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" form="aluno-form" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="aluno-form" className="form-grid" onSubmit={handleSave}>
            <div className="field full">
              <label>Nome Completo *</label>
              <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="field">
              <label>Matrícula</label>
              <input value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} />
            </div>
            <div className="field">
              <label>CPF</label>
              <input
                inputMode="numeric"
                maxLength={14}
                placeholder="000.000.000-00 (opcional)"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: formatarCpf(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Turma</label>
              <SearchableSelect
                value={form.turma_id}
                onChange={(v) => setForm({ ...form, turma_id: v })}
                placeholder="Sem turma"
                options={[{ value: '', label: 'Sem turma' }, ...turmaOptions]}
              />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_ALUNO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </form>
        </Modal>
      )}

      {importOpen && (
        <ImportarAlunos
          alunos={rows}
          turmas={turmas}
          onClose={() => setImportOpen(false)}
          onImportado={() => { setImportOpen(false); load() }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir Aluno"
          message={`Tem certeza que deseja excluir o aluno "${deleting.nome}"? Se ele saiu da escola, prefira mudar o status para "Transferido".`}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          danger
        />
      )}
    </div>
  )
}
