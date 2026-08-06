import Modal from './Modal.jsx'

export default function ConfirmDialog({ title, message, onConfirm, onCancel, danger }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      maxWidth={420}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            Confirmar
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: 'var(--cinza-texto)', fontSize: 14 }}>{message}</p>
    </Modal>
  )
}
