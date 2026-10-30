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

// Data de hoje no fuso local (toISOString usaria UTC e viraria o dia às 21h no Brasil)
export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

export function formatDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('pt-BR')
}

export function formatarCpf(valor) {
  const digitos = String(valor || '').replace(/\D/g, '').slice(0, 11)
  return digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function formatarTelefone(valor) {
  const digitos = String(valor || '').replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 10) {
    return digitos.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digitos.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export function emailValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor || '').trim())
}

// Valida os dígitos verificadores do CPF
export function cpfValido(valor) {
  const cpf = String(valor || '').replace(/\D/g, '')
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  for (const tamanho of [9, 10]) {
    let soma = 0
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i)
    const digito = ((soma * 10) % 11) % 10
    if (digito !== Number(cpf[tamanho])) return false
  }
  return true
}

// Dias entre duas datas ISO (yyyy-mm-dd); usa hoje quando "ate" não é informado
export function diasEntre(de, ate) {
  if (!de) return null
  const inicio = new Date(de + 'T00:00:00')
  const fim = ate ? new Date(ate + 'T00:00:00') : new Date(todayISO() + 'T00:00:00')
  return Math.round((fim - inicio) / 86400000)
}

// Remove acentos e deixa minúsculo, para comparar textos ("Turma Ç" ~ "turma c")
export function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

// Lê um arquivo CSV como texto. Planilhas salvas pelo Excel em português
// costumam vir em Windows-1252; se o UTF-8 der caracteres inválidos, relê assim.
export async function lerArquivoTexto(file) {
  const buffer = await file.arrayBuffer()
  const utf8 = new TextDecoder('utf-8').decode(buffer)
  if (!utf8.includes('\uFFFD')) return utf8.replace(/^\uFEFF/, '')
  return new TextDecoder('windows-1252').decode(buffer)
}

// Converte o texto de um CSV (separado por ; ou ,) em uma lista de linhas (arrays)
export function parseCSV(texto) {
  const primeiraLinha = texto.split(/\r?\n/, 1)[0] || ''
  const sep = (primeiraLinha.match(/;/g) || []).length >= (primeiraLinha.match(/,/g) || []).length ? ';' : ','
  const linhas = []
  let linha = []
  let campo = ''
  let aspas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') {
      aspas = true
    } else if (c === sep) {
      linha.push(campo); campo = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      linha.push(campo); campo = ''
      if (linha.some((v) => v.trim() !== '')) linhas.push(linha)
      linha = []
    } else {
      campo += c
    }
  }
  linha.push(campo)
  if (linha.some((v) => v.trim() !== '')) linhas.push(linha)
  return linhas.map((l) => l.map((v) => v.trim()))
}
