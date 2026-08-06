import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import './Login.css'

function formatarCpf(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)
  return digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export default function Login() {
  const navigate = useNavigate()
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(evento) {
    evento.preventDefault()
    setErro('')

    const cpfLimpo = cpf.replace(/\D/g, '')
    if (cpfLimpo.length !== 11) {
      setErro('Informe um CPF válido.')
      return
    }
    if (!senha) {
      setErro('Informe a senha.')
      return
    }

    setCarregando(true)
    const { data, error } = await supabase.rpc('autenticar_usuario', {
      p_cpf: cpfLimpo,
      p_senha: senha,
    })
    setCarregando(false)

    if (error) {
      setErro('Não foi possível validar o acesso agora. Tente novamente.')
      return
    }

    if (!data || data.length === 0) {
      setErro('CPF, senha ou status inválidos.')
      return
    }

    const usuario = data[0]

    // Busca o perfil de acesso do usuário (feito à parte para não depender
    // do retorno da função autenticar_usuario, que já está em produção).
    let perfilNome = null
    let perfilIsAdmin = false
    if (usuario.perfil_id) {
      const { data: perfil } = await supabase
        .from('perfis')
        .select('nome, is_admin')
        .eq('id', usuario.perfil_id)
        .maybeSingle()
      if (perfil) {
        perfilNome = perfil.nome
        perfilIsAdmin = !!perfil.is_admin
      }
    }

    localStorage.setItem(
      'usuarioLogado',
      JSON.stringify({ ...usuario, perfil_nome: perfilNome, perfil_is_admin: perfilIsAdmin })
    )
    navigate('/', { replace: true })
  }

  return (
    <div className="login-tela">
      <div className="login-marca">
        <div className="login-marca-brand">
          <div className="logo-mark">PE</div>
          <h1>Patrimônio Escolar</h1>
          <span>Sistema de Gestão</span>
        </div>
        <p className="login-marca-texto">
          Acesse com seu CPF e senha para gerenciar tipos, unidades, setores, responsáveis
          e o patrimônio da instituição.
        </p>
      </div>

      <div className="login-cartao">
        <form className="login-form card" onSubmit={handleSubmit} noValidate>
          <h2 className="login-form-titulo">Entrar</h2>

          <div className="field full">
            <label htmlFor="cpf">CPF</label>
            <input
              id="cpf"
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(formatarCpf(e.target.value))}
              maxLength={14}
              autoComplete="username"
            />
          </div>

          <div className="field full">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {erro && <div className="alert alert-error">{erro}</div>}

          <button className="btn btn-primary login-botao" type="submit" disabled={carregando}>
            {carregando ? 'Verificando...' : 'Acessar'}
          </button>
        </form>
      </div>
    </div>
  )
}