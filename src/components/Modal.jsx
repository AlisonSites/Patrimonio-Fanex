import { FaTimes } from 'react-icons/fa'

export default function Modal({ title, onClose, children, footer, maxWidth, headerActions }) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={maxWidth ? { maxWidth } : undefined}>
        <div className="modal-header">
          <h3>{title}</h3>
          <div className="modal-header-actions">
            {headerActions}
            <button className="modal-close" onClick={onClose} title="Fechar">
              <FaTimes />
            </button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
