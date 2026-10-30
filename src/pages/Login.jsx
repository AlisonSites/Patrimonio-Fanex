import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import PasswordInput from '../components/PasswordInput.jsx'
import { carregarPerfil, salvarUsuarioLogado } from '../lib/auth.js'
import { emailValido, formatarCpf } from '../lib/utils.js'
import Logo from '../assets/logo-branco.png'
import './Login.css'

// O campo aceita CPF ou e-mail: só aplica a máscara de CPF enquanto
// o valor digitado tiver apenas números e pontuação de CPF.
function ehEmail(valor) {
  return /[^\d.\-\s]/.test(valor)
}

export default function Login() {
  const navigate = useNavigate()
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(evento) {
    evento.preventDefault()
    setErro('')

    const porEmail = ehEmail(login)
    const email = login.trim().toLowerCase()
    let cpfLimpo = login.replace(/\D/g, '')
    if (porEmail ? !emailValido(email) : cpfLimpo.length !== 11) {
      setErro('Informe um CPF ou e-mail válido.')
      return
    }
    if (!senha) {
      setErro('Informe a senha.')
      return
    }

    setCarregando(true)

    // Entrando pelo e-mail: descobre o CPF do usuário e valida a senha
    // pela mesma função do login por CPF (autenticar_usuario).
    if (porEmail) {
      const { data: encontrado, error: errBusca } = await supabase
        .from('usuarios')
        .select('cpf')
        .eq('email', email)
        .maybeSingle()
      if (errBusca) {
        setCarregando(false)
        setErro('Não foi possível validar o acesso agora. Tente novamente.')
        return
      }
      if (!encontrado) {
        setCarregando(false)
        setErro('E-mail, senha ou status inválidos.')
        return
      }
      cpfLimpo = encontrado.cpf
    }

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
      setErro(`${porEmail ? 'E-mail' : 'CPF'}, senha ou status inválidos.`)
      return
    }

    const usuario = data[0]

    // Busca o perfil de acesso do usuário (feito à parte para não depender
    // do retorno da função autenticar_usuario, que já está em produção).
    const perfil = await carregarPerfil(usuario.perfil_id)

    salvarUsuarioLogado({ ...usuario, ...perfil })
    navigate('/', { replace: true })
  }

  return (
    <div className="login-tela">
      <div className="login-marca">
        <div className="login-marca-brand">
          <div className="logo-mark">
            <img src={Logo} alt="" id='Logo-login'/>
          </div>
          <h1>Patrimônio Escolar</h1>
          <span>Sistema de Gestão</span>
        </div>
        <p className="login-marca-texto">
          Acesse com seu CPF ou e-mail e senha para gerenciar o patrimônio da instituição, os
          Chromebooks dos alunos e da escola, empréstimos e manutenções.
        </p>
      </div>

      <div className="login-cartao">
        <form className="login-form card" onSubmit={handleSubmit} noValidate>
          {/* <img src={Logo} alt="" id='Logo-Login-Form'/> */}
          <h2 className="login-form-titulo">Entrar</h2>

          <div className="field full">
            <label htmlFor="login">CPF ou e-mail</label>
            <input
              id="login"
              type="text"
              placeholder="000.000.000-00 ou nome@exemplo.com"
              value={login}
              onChange={(e) => setLogin(ehEmail(e.target.value) ? e.target.value : formatarCpf(e.target.value))}
              autoCapitalize="none"
              autoComplete="username"
            />
          </div>

          <div className="field full">
            <label htmlFor="senha">Senha</label>
            <PasswordInput
              id="senha"
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