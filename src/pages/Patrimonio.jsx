import { useEffect, useMemo, useState } from 'react'
import { supabase, NOTAS_FISCAIS_BUCKET, FOTOS_PATRIMONIO_BUCKET } from '../lib/supabaseClient.js'
import { patrimonioCodigo, formatCurrency, formatDate, todayISO } from '../lib/utils.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import FichaPatrimonio from '../components/FichaPatrimonio.jsx'
import FileCaptureField from '../components/FileCaptureField.jsx'
import { FaEdit, FaTrash, FaPaperclip, FaInbox, FaIdCard, FaCamera } from 'react-icons/fa'

const EMPTY_FORM = {
  modelo: '',
  nome: '',
  numero_serie: '',
  nota_fiscal_numero: '',
  nota_fiscal_arquivo: '',
  foto: '',
  data_aquisicao: todayISO(),
  valor_original: '',
  valor_compra: '',
  vencimento_garantia: '',
  tipo_id: '',
  unidade_id: '',
  setor_id: '',
  responsavel_id: '',
  fornecedor_id: '',
  observacao: '',
  status: 'ativo',
}

export default function Patrimonio() {
  const [rows, setRows] = useState([])
  const [tipos, setTipos] = useState([])
  const [unidades, setUnidades] = useState([])
  const [setores, setSetores] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [fornecedores, setFornecedores] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ativo')
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [unidadeFilter, setUnidadeFilter] = useState('todos')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [novoArquivo, setNovoArquivo] = useState(null)
  const [novaFoto, setNovaFoto] = useState(null)
  const [novaFotoPreview, setNovaFotoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  // Ficha (modal com todas as informações do patrimônio)
  const [ficha, setFicha] = useState(null)
  const [fichaFotoUrl, setFichaFotoUrl] = useState(null)
  const [fichaNotaUrl, setFichaNotaUrl] = useState(null)
  const [fichaConservacoes, setFichaConservacoes] = useState([])
  const [fichaMovimentacoes, setFichaMovimentacoes] = useState([])
  const [fichaQuebrados, setFichaQuebrados] = useState([])
  const [fichaHistoricoLoading, setFichaHistoricoLoading] = useState(false)

  async function loadAuxData() {
    const [t, u, s, r, f] = await Promise.all([
      supabase.from('tipos').select('*').eq('status', 'ativo').order('nome'),
      supabase.from('unidades').select('*').eq('status', 'ativo').order('nome'),
      supabase.from('setores').select('*, unidades(id,nome)').eq('status', 'ativo').order('nome'),
      supabase.from('responsaveis').select('*').eq('status', 'ativo').order('nome'),
      supabase.from('fornecedores').select('*').eq('status', 'ativo').order('nome'),
    ])
    setTipos(t.data || [])
    setUnidades(u.data || [])
    setSetores(s.data || [])
    setResponsaveis(r.data || [])
    setFornecedores(f.data || [])
  }

  async function load() {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('patrimonios')
      .select(`*, tipos(id,nome), unidades(id,nome), setores(id,nome), responsaveis(id,nome), fornecedores(id,nome)`)
      .order('id', { ascending: false })
    if (err) setError(err.message)
    else setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load(); loadAuxData() }, [])

  function openNew() {
    setForm(EMPTY_FORM)
    setNovoArquivo(null)
    setNovaFoto(null)
    setNovaFotoPreview('')
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    setForm({
      modelo: row.modelo || '',
      nome: row.nome || '',
      numero_serie: row.numero_serie || '',
      nota_fiscal_numero: row.nota_fiscal_numero || '',
      nota_fiscal_arquivo: row.nota_fiscal_arquivo || '',
      foto: row.foto || '',
      data_aquisicao: row.data_aquisicao || '',
      valor_original: row.valor_original ?? '',
      valor_compra: row.valor_compra ?? '',
      vencimento_garantia: row.vencimento_garantia || '',
      tipo_id: row.tipo_id || '',
      unidade_id: row.unidade_id || '',
      setor_id: row.setor_id || '',
      responsavel_id: row.responsavel_id || '',
      fornecedor_id: row.fornecedor_id || '',
      observacao: row.observacao || '',
      status: row.status || 'ativo',
    })
    setNovoArquivo(null)
    setNovaFoto(null)
    setNovaFotoPreview('')
    setEditing(row)
    setModalOpen(true)
    setFicha(null)
  }

  function handleFotoChange(file) {
    setNovaFoto(file || null)
    if (novaFotoPreview) URL.revokeObjectURL(novaFotoPreview)
    setNovaFotoPreview(file ? URL.createObjectURL(file) : '')
  }

  function handleNotaFiscalChange(file) {
    setNovoArquivo(file || null)
  }

  // Setores filtrados pela unidade escolhida (opcional, mas ajuda a evitar erro de digitação)
  const setoresDaUnidade = useMemo(() => {
    if (!form.unidade_id) return setores
    return setores.filter((s) => String(s.unidade_id) === String(form.unidade_id))
  }, [setores, form.unidade_id])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    let notaFiscalPath = form.nota_fiscal_arquivo
    let fotoPath = form.foto

    try {
      if (novoArquivo) {
        const ext = novoArquivo.name.split('.').pop()
        const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from(NOTAS_FISCAIS_BUCKET)
          .upload(path, novoArquivo, { upsert: false })
        if (uploadErr) throw uploadErr
        notaFiscalPath = path
      }

      if (novaFoto) {
        const ext = novaFoto.name.split('.').pop()
        const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from(FOTOS_PATRIMONIO_BUCKET)
          .upload(path, novaFoto, { upsert: false })
        if (uploadErr) throw uploadErr
        fotoPath = path
      }

      const payload = {
        modelo: form.modelo,
        nome: form.nome,
        numero_serie: form.numero_serie,
        nota_fiscal_numero: form.nota_fiscal_numero,
        nota_fiscal_arquivo: notaFiscalPath || null,
        foto: fotoPath || null,
        data_aquisicao: form.data_aquisicao || null,
        valor_original: form.valor_original === '' ? null : Number(form.valor_original),
        valor_compra: form.valor_compra === '' ? null : Number(form.valor_compra),
        vencimento_garantia: form.vencimento_garantia || null,
        tipo_id: form.tipo_id || null,
        unidade_id: form.unidade_id || null,
        setor_id: form.setor_id || null,
        responsavel_id: form.responsavel_id || null,
        fornecedor_id: form.fornecedor_id || null,
        observacao: form.observacao,
        status: form.status || 'ativo',
      }

      let err
      if (editing) {
        ; ({ error: err } = await supabase.from('patrimonios').update(payload).eq('id', editing.id))
      } else {
        ; ({ error: err } = await supabase.from('patrimonios').insert(payload))
      }
      if (err) throw err

      setModalOpen(false)
      load()
    } catch (err) {
      setError(err.message || 'Erro ao salvar patrimônio')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const { error: err } = await supabase.from('patrimonios').delete().eq('id', deleting.id)
    if (err) { setError(err.message); setDeleting(null); return }
    setDeleting(null)
    load()
  }

  async function getArquivoUrl(bucket, path) {
    if (!path) return null
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60)
    return data?.signedUrl || null
  }

  async function handleAbrirArquivo(path) {
    const url = await getArquivoUrl(NOTAS_FISCAIS_BUCKET, path)
    if (url) window.open(url, '_blank')
    else setError('Não foi possível abrir o arquivo da nota fiscal.')
  }

  async function handleAbrirFoto(path) {
    const url = await getArquivoUrl(FOTOS_PATRIMONIO_BUCKET, path)
    if (url) window.open(url, '_blank')
    else setError('Não foi possível abrir a foto do produto.')
  }

  async function openFicha(row) {
    setFicha(row)
    setFichaFotoUrl(null)
    setFichaNotaUrl(null)
    setFichaConservacoes([])
    setFichaMovimentacoes([])
    setFichaQuebrados([])
    setFichaHistoricoLoading(true)

    if (row.foto) {
      getArquivoUrl(FOTOS_PATRIMONIO_BUCKET, row.foto).then(setFichaFotoUrl)
    }
    if (row.nota_fiscal_arquivo) {
      getArquivoUrl(NOTAS_FISCAIS_BUCKET, row.nota_fiscal_arquivo).then(setFichaNotaUrl)
    }

    const [consRes, movRes, quebRes] = await Promise.all([
      supabase
        .from('patrimonio_conservacoes')
        .select('*')
        .eq('patrimonio_id', row.id)
        .order('data', { ascending: false }),
      supabase
        .from('patrimonio_movimentacoes')
        .select('*, unidade_origem:unidade_origem_id(id,nome), setor_origem:setor_origem_id(id,nome), unidade_destino:unidade_destino_id(id,nome), setor_destino:setor_destino_id(id,nome)')
        .eq('patrimonio_id', row.id)
        .order('data', { ascending: false }),
      supabase
        .from('patrimonio_quebrados')
        .select('*')
        .eq('patrimonio_id', row.id)
        .order('data', { ascending: false }),
    ])
    setFichaConservacoes(consRes.data || [])
    setFichaMovimentacoes(movRes.data || [])
    setFichaQuebrados(quebRes.data || [])
    setFichaHistoricoLoading(false)
  }

  function handleFichaEditar(row) {
    setFicha(null)
    openEdit(row)
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch = search
        ? [r.nome, r.modelo, r.numero_serie, r.nota_fiscal_numero]
          .some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
        : true
      const matchesStatus = statusFilter === 'todos' ? true : r.status === statusFilter
      const matchesTipo = tipoFilter === 'todos' ? true : String(r.tipo_id) === String(tipoFilter)
      const matchesUnidade = unidadeFilter === 'todos' ? true : String(r.unidade_id) === String(unidadeFilter)
      return matchesSearch && matchesStatus && matchesTipo && matchesUnidade
    })
  }, [rows, search, statusFilter, tipoFilter, unidadeFilter])

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <input className="search-input" placeholder="Buscar por nome, modelo, série..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="filter-select" value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}>
              <option value="todos">Todos os tipos</option>
              {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            <select className="filter-select" value={unidadeFilter} onChange={(e) => setUnidadeFilter(e.target.value)}>
              <option value="todos">Todas as unidades</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={openNew}>+ Novo Patrimônio</button>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon"><FaInbox /></div>Nenhum patrimônio encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Nome</th><th>Modelo</th><th>Nº Série</th><th>Tipo</th>
                  <th>Unidade</th><th>Setor</th><th>Responsável</th><th>Valor Compra</th>
                  <th>Aquisição</th><th>Garantia até</th><th>Status</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{patrimonioCodigo(row.id)}</td>
                    <td>{row.nome}</td>
                    <td>{row.modelo}</td>
                    <td>{row.numero_serie}</td>
                    <td>{row.tipos?.nome || '-'}</td>
                    <td>{row.unidades?.nome || '-'}</td>
                    <td>{row.setores?.nome || '-'}</td>
                    <td>{row.responsaveis?.nome || '-'}</td>
                    <td>{formatCurrency(row.valor_compra)}</td>
                    <td>{formatDate(row.data_aquisicao)}</td>
                    <td>{formatDate(row.vencimento_garantia)}</td>
                    <td><StatusBadge status={row.status} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" title="Ver ficha" onClick={() => openFicha(row)}><FaIdCard /></button>
                        {row.nota_fiscal_arquivo && (
                          <button className="icon-btn" title="Ver nota fiscal" onClick={() => handleAbrirArquivo(row.nota_fiscal_arquivo)}><FaPaperclip /></button>
                        )}
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
          title={editing ? 'Editar Patrimônio' : 'Novo Patrimônio'}
          onClose={() => setModalOpen(false)}
          maxWidth={760}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" form="patrimonio-form" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="patrimonio-form" className="form-grid" onSubmit={handleSave}>
            <div className="field full">
              <label>ID do Patrimônio</label>
              <div className="field-readonly">
                {editing ? patrimonioCodigo(editing.id) : 'Gerado automaticamente ao salvar'}
              </div>
            </div>

            <div className="field full">
              <label>Foto do Produto (opcional)</label>
              <div className="photo-upload">
                <div className="photo-upload-preview">
                  {novaFotoPreview ? (
                    <img src={novaFotoPreview} alt="Pré-visualização" />
                  ) : form.foto && !novaFoto ? (
                    <div className="photo-upload-placeholder"><FaCamera size={20} /><span>Foto já anexada</span></div>
                  ) : (
                    <div className="photo-upload-placeholder"><FaCamera size={20} /><span>Sem foto</span></div>
                  )}
                </div>
                <FileCaptureField
                  accept="image/*"
                  cameraLabel="Tirar Foto"
                  uploadLabel="Enviar da Galeria"
                  onChange={handleFotoChange}
                />
              </div>
            </div>

            <div className="field">
              <label>Nome do Patrimônio</label>
              <input  value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="field">
              <label>Modelo do Patrimônio</label>
              <input  value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
            </div>

            <div className="field">
              <label>Número de Série</label>
              <input  value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} />
            </div>
            <div className="field">
              <label>Número da Nota Fiscal</label>
              <input value={form.nota_fiscal_numero} onChange={(e) => setForm({ ...form, nota_fiscal_numero: e.target.value })} />
            </div>

            <div className="field full">
              <label>Arquivo da Nota Fiscal (opcional)</label>
              <div className="file-field">
                <FileCaptureField
                  accept=".pdf,.png,.jpg,.jpeg"
                  cameraAccept="image/*"
                  cameraLabel="Tirar Foto da Nota"
                  uploadLabel="Enviar Arquivo (PDF/Imagem)"
                  onChange={handleNotaFiscalChange}
                />
                {novoArquivo && (
                  <span className="file-chip"><FaPaperclip /> {novoArquivo.name}</span>
                )}
                {form.nota_fiscal_arquivo && !novoArquivo && (
                  <span className="file-chip"><FaPaperclip /> Arquivo já anexado — envie um novo para substituir</span>
                )}
              </div>
            </div>

            <div className="field">
              <label>Data de Aquisição</label>
              <input  type="date" value={form.data_aquisicao} onChange={(e) => setForm({ ...form, data_aquisicao: e.target.value })} />
            </div>
            <div className="field">
              <label>Vencimento da Garantia</label>
              <input type="date" value={form.vencimento_garantia} onChange={(e) => setForm({ ...form, vencimento_garantia: e.target.value })} />
            </div>

            <div className="field">
              <label>Valor Original</label>
              <input type="number" step="0.01" min="0" value={form.valor_original} onChange={(e) => setForm({ ...form, valor_original: e.target.value })} />
            </div>
            <div className="field">
              <label>Valor de Compra</label>
              <input type="number" step="0.01" min="0" value={form.valor_compra} onChange={(e) => setForm({ ...form, valor_compra: e.target.value })} />
            </div>

            <div className="field">
              <label>Tipo</label>
              <select  value={form.tipo_id} onChange={(e) => setForm({ ...form, tipo_id: e.target.value })}>
                <option value="" disabled>Selecione o tipo</option>
                {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Fornecedor</label>
              <select value={form.fornecedor_id} onChange={(e) => setForm({ ...form, fornecedor_id: e.target.value })}>
                <option value="">Selecione o fornecedor</option>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Unidade</label>
              <select  value={form.unidade_id} onChange={(e) => setForm({ ...form, unidade_id: e.target.value, setor_id: '' })}>
                <option value="" disabled>Selecione a unidade</option>
                {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Setor</label>
              <select  value={form.setor_id} onChange={(e) => setForm({ ...form, setor_id: e.target.value })}>
                <option value="" disabled>Selecione o setor</option>
                {setoresDaUnidade.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>

            <div className="field full">
              <label>Responsável</label>
              <select value={form.responsavel_id} onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}>
                <option value="" disabled>Selecione o responsável</option>
                {responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>

            <div className="field full">
              <label>Observação</label>
              <textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>

            <div className="field full">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </form>
        </Modal>
      )}

      {ficha && (
        <FichaPatrimonio
          patrimonio={ficha}
          fotoUrl={fichaFotoUrl}
          notaFiscalUrl={fichaNotaUrl}
          conservacoes={fichaConservacoes}
          movimentacoes={fichaMovimentacoes}
          quebrados={fichaQuebrados}
          historicoLoading={fichaHistoricoLoading}
          onClose={() => setFicha(null)}
          onEdit={handleFichaEditar}
          onAbrirNotaFiscal={handleAbrirArquivo}
          onAbrirFoto={handleAbrirFoto}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir Patrimônio"
          message="Tem certeza que deseja excluir este patrimônio? Essa ação não pode ser desfeita."
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          danger
        />
      )}
    </div>
  )
}