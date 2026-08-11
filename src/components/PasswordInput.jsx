import { useState } from 'react'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

/**
 * Campo de senha com botão para mostrar/ocultar o valor digitado.
 * Aceita as mesmas props de um <input>, exceto "type" (sempre controlado
 * internamente entre "password" e "text").
 */
export default function PasswordInput({ id, className, ...props }) {
  const [visivel, setVisivel] = useState(false)

  return (
    <div className="password-field">
      <input
        id={id}
        type={visivel ? 'text' : 'password'}
        className={className}
        {...props}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisivel((v) => !v)}
        tabIndex={-1}
        title={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {visivel ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  )
}
