// Etiqueta colorida genérica. tom: verde | vermelho | azul | laranja | cinza
export default function Badge({ tom = 'cinza', children }) {
  return (
    <span className={`badge badge-${tom}`}>
      <span className="badge-dot" />
      {children}
    </span>
  )
}
