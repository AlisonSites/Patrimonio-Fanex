import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { supabase, FOTOS_USUARIOS_BUCKET, fotoUsuarioUrl } from '../lib/supabaseClient.js'
import { getUsuarioLogado, salvarUsuarioLogado } from '../lib/auth.js'
import { emailValido, formatarCpf, formatarTelefone } from '../lib/utils.js'
import PasswordInput from '../components/PasswordInput.jsx'
import FileCaptureField from '../components/FileCaptureField.jsx'
import { FaArrowLeft, FaCamera, FaTrash } from 'react-icons/fa'

const SENHA_VAZIA = { atual: '', nova: '', confirmar: '' }

/**
 * Tela "Meu perfil": o próprio usuário logado altera seus dados pessoais,
 * a foto e a senha. CPF e perfil de acesso só podem ser alterados pelo
 * administrador, na tela de Usuários.
 */
export default function MeuPerfil() {
  const { setUsuario } = useOutletContext()
  const navigate = useNavigate()
  const usuarioLogado = getUsuarioLogado()

  // Volta para a tela anterior; se o perfil foi aberto direto pelo link, vai para o Início
  function voltar() {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/')
  }

  const [dados, setDados] = useState(null)
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', data_nascimento: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [salvandoDados, setSalvandoDados] = useState(false)
  const [msgDados, setMsgDados] = useState('')

  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [msgFoto, setMsgFoto] = useState('')

  const [senha, setSenha] = useState(SENHA_VAZIA)
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const [msgSenha, setMsgSenha] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('usuarios')
      .select('id, nome, cpf, email, telefone, data_nascimento, foto')
      .eq('id', usuarioLogado.id)
      .maybeSingle()
    if (err) setError(err.message)
    else if (!data) setError('Usuário não encontrado.')
    else {
      setDados(data)
      setForm({
        nome: data.nome || '',
        email: data.email || '',
        telefone: formatarTelefone(data.telefone),
        data_nascimento: data.data_nascimento || '',
      })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Atualiza o usuário salvo no navegador e o topo do site
  function atualizarLogado(campos) {
    const atualizado = { ...getUsuarioLogado(), ...campos }
    salvarUsuarioLogado(atualizado)
    setUsuario(atualizado)
  }

  async function handleSalvarDados(e) {
    e.preventDefault()
    setError('')
    setMsgDados('')

    if (!form.nome.trim()) { setError('Informe o seu nome.'); return }
    const email = form.email.trim().toLowerCase()
    if (email && !emailValido(email)) { setError('Informe um e-mail válido.'); return }
    const telefone = form.telefone.replace(/\D/g, '')
    if (telefone && telefone.length < 10) { setError('Informe um telefone válido, com DDD.'); return }

    setSalvandoDados(true)
    const payload = {
      nome: form.nome.trim(),
      email: email || null,
      telefone: telefone || null,
      data_nascimento: form.data_nascimento || null,
    }
    const { error: err } = await supabase.from('usuarios').update(payload).eq('id', dados.id)
    setSalvandoDados(false)
    if (err) {
      setError(err.message.includes('uq_usuarios_email') ? 'Esse e-mail já está sendo usado por outro usuário.' : err.message)
      return
    }

    setDados({ ...dados, ...payload })
    atualizarLogado({ nome: payload.nome })
    setMsgDados('Dados atualizados com sucesso.')
  }

  async function handleFotoChange(file) {
    if (!file) return
    setError('')
    setMsgFoto('')
    if (!file.type.startsWith('image/')) { setError('Escolha um arquivo de imagem.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('A foto deve ter no máximo 5 MB.'); return }

    setEnviandoFoto(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${dados.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from(FOTOS_USUARIOS_BUCKET)
        .upload(path, file, { upsert: false })
      if (uploadErr) throw uploadErr

      const { error: err } = await supabase.from('usuarios').update({ foto: path }).eq('id', dados.id)
      if (err) throw err

      // Apaga a foto anterior, que não é mais usada
      if (dados.foto) await supabase.storage.from(FOTOS_USUARIOS_BUCKET).remove([dados.foto])

      setDados({ ...dados, foto: path })
      atualizarLogado({ foto: path })
      setMsgFoto('Foto atualizada.')
    } catch (err) {
      setError(err.message || 'Não foi possível enviar a foto.')
    }
    setEnviandoFoto(false)
  }

  async function handleRemoverFoto() {
    setError('')
    setMsgFoto('')
    setEnviandoFoto(true)
    const { error: err } = await supabase.from('usuarios').update({ foto: null }).eq('id', dados.id)
    if (err) { setError(err.message); setEnviandoFoto(false); return }
    await supabase.storage.from(FOTOS_USUARIOS_BUCKET).remove([dados.foto])
    setDados({ ...dados, foto: null })
    atualizarLogado({ foto: null })
    setMsgFoto('Foto removida.')
    setEnviandoFoto(false)
  }

  async function handleTrocarSenha(e) {
    e.preventDefault()
    setErroSenha('')
    setMsgSenha('')

    if (!senha.atual || !senha.nova || !senha.confirmar) { setErroSenha('Preencha todos os campos de senha.'); return }
    if (senha.nova.length < 6) { setErroSenha('A nova senha deve ter pelo menos 6 caracteres.'); return }
    if (senha.nova !== senha.confirmar) { setErroSenha('A confirmação não confere com a nova senha.'); return }
    if (senha.nova === senha.atual) { setErroSenha('A nova senha deve ser diferente da atual.'); return }

    setSalvandoSenha(true)
    // Confere a senha atual com a mesma função usada no login
    const { data: valido, error: errAuth } = await supabase.rpc('autenticar_usuario', {
      p_cpf: dados.cpf,
      p_senha: senha.atual,
    })
    if (errAuth) {
      setSalvandoSenha(false)
      setErroSenha('Não foi possível validar a senha agora. Tente novamente.')
      return
    }
    if (!valido || valido.length === 0) {
      setSalvandoSenha(false)
      setErroSenha('A senha atual está incorreta.')
      return
    }

    const { error: err } = await supabase.from('usuarios').update({ senha: senha.nova }).eq('id', dados.id)
    setSalvandoSenha(false)
    if (err) { setErroSenha(err.message); return }

    setSenha(SENHA_VAZIA)
    setMsgSenha('Senha alterada com sucesso.')
  }

  if (loading) return <div className="loading-state">Carregando...</div>
  if (!dados) return <div className="alert alert-error">{error || 'Não foi possível carregar o seu perfil.'}</div>

  const fotoUrl = fotoUsuarioUrl(dados.foto)

  return (
    <div className="meu-perfil">
      <div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={voltar}>
          <FaArrowLeft /> Voltar
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header"><h3>Foto</h3></div>
        <div className="card-body">
          <div className="photo-upload">
            <div className="photo-upload-preview meu-perfil-foto">
              {fotoUrl ? (
                <img src={fotoUrl} alt="Sua foto" />
              ) : (
                <div className="photo-upload-placeholder"><FaCamera size={20} /><span>Sem foto</span></div>
              )}
            </div>
            <div className="file-field">
              <FileCaptureField
                accept="image/*"
                cameraLabel="Tirar Foto"
                uploadLabel={enviandoFoto ? 'Enviando...' : 'Enviar da Galeria'}
                onChange={handleFotoChange}
              />
              {dados.foto && (
                <div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={handleRemoverFoto} disabled={enviandoFoto}>
                    <FaTrash /> Remover foto
                  </button>
                </div>
              )}
              {msgFoto && <small className="hint">{msgFoto}</small>}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Dados pessoais</h3></div>
        <div className="card-body">
          <form className="form-grid" onSubmit={handleSalvarDados}>
            <div className="field full">
              <label>Nome *</label>
              <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="field">
              <label>CPF</label>
              <div className="field-readonly">{formatarCpf(dados.cpf)}</div>
            </div>
            <div className="field">
              <label>Perfil de acesso</label>
              <div className="field-readonly">{usuarioLogado.perfil_nome || 'Sem perfil'}</div>
            </div>
            <div className="field">
              <label>E-mail</label>
              <input type="email" placeholder="nome@exemplo.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Telefone</label>
              <input
                inputMode="numeric"
                placeholder="(00) 00000-0000"
                maxLength={15}
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Data de nascimento</label>
              <input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
            </div>
            <div className="field full meu-perfil-acoes">
              {msgDados && <span className="meu-perfil-ok">{msgDados}</span>}
              <button className="btn btn-primary" type="submit" disabled={salvandoDados}>
                {salvandoDados ? 'Salvando...' : 'Salvar dados'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Trocar senha</h3></div>
        <div className="card-body">
          {erroSenha && <div className="alert alert-error">{erroSenha}</div>}
          <form className="form-grid" onSubmit={handleTrocarSenha}>
            <div className="field full">
              <label>Senha atual</label>
              <PasswordInput
                autoComplete="current-password"
                value={senha.atual}
                onChange={(e) => setSenha({ ...senha, atual: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Nova senha</label>
              <PasswordInput
                autoComplete="new-password"
                placeholder="Mínimo de 6 caracteres"
                value={senha.nova}
                onChange={(e) => setSenha({ ...senha, nova: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Confirmar nova senha</label>
              <PasswordInput
                autoComplete="new-password"
                value={senha.confirmar}
                onChange={(e) => setSenha({ ...senha, confirmar: e.target.value })}
              />
            </div>
            <div className="field full meu-perfil-acoes">
              {msgSenha && <span className="meu-perfil-ok">{msgSenha}</span>}
              <button className="btn btn-primary" type="submit" disabled={salvandoSenha}>
                {salvandoSenha ? 'Alterando...' : 'Alterar senha'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
