export default function StatusBadge({ status }) {
  const ativo = status === 'ativo'
  return (
    <span className={`badge ${ativo ? 'badge-ativo' : 'badge-inativo'}`}>
      <span className="badge-dot" />
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  )
}
