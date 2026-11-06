import { useEffect, useRef } from 'react'
import { FaTimes } from 'react-icons/fa'

/**
 * Janela modal. Com a prop "error", mostra a mensagem de erro no topo do
 * conteúdo — o aviso da página fica escondido atrás do modal — e rola até ela.
 */
export default function Modal({ title, onClose, children, footer, maxWidth, headerActions, error }) {
  const bodyRef = useRef(null)

  useEffect(() => {
    if (error) bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [error])

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={maxWidth ? { '--modal-max-width': `${maxWidth}px` } : undefined}>
        <div className="modal-header">
          <h3>{title}</h3>
          <div className="modal-header-actions">
            {headerActions}
            <button className="modal-close" onClick={onClose} title="Fechar">
              <FaTimes />
            </button>
          </div>
        </div>
        <div className="modal-body" ref={bodyRef}>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {children}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
