export function formatCurrency(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '-'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(value) {
  if (!value) return '-'
  const d = new Date(value + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('pt-BR')
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Gera o código visível do patrimônio a partir do id numérico (ex: 1 -> PAT-0001)
export function patrimonioCodigo(id) {
  return `PAT-${String(id).padStart(4, '0')}`
}

export function codigoGenerico(prefixo, id) {
  return `${prefixo}-${String(id).padStart(4, '0')}`
}

// Exporta um array de objetos para CSV e dispara o download
export function exportToCSV(filename, rows, columns) {
  // columns: [{ key, label }]
  const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(';')
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key] ?? ''
        return `"${String(val).replace(/"/g, '""')}"`
      })
      .join(';')
  )
  const csvContent = [header, ...lines].join('\r\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function statusLabel(status) {
  return status === 'ativo' ? 'Ativo' : 'Inativo'
}
