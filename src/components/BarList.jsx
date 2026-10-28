// Card com lista de barras horizontais (usado nos dashboards)
// data: [{ label, total, extra? }]
export default function BarList({ title, data, accent, vazio = 'Sem dados.' }) {
  const max = Math.max(1, ...data.map((d) => d.total))
  return (
    <div className="card">
      <div className="card-header"><h3>{title}</h3></div>
      <div className="card-body">
        {data.length === 0 ? (
          <div className="barlist-vazio">{vazio}</div>
        ) : (
          data.map((d) => (
            <div key={d.label} className="barlist-item">
              <div className="barlist-legenda">
                <span className="barlist-label">{d.label}</span>
                <span className="barlist-extra">{d.extra ?? d.total}</span>
              </div>
              <div className="barlist-trilho">
                <div
                  className="barlist-barra"
                  style={{ width: `${(d.total / max) * 100}%`, background: accent || 'var(--laranja)' }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
