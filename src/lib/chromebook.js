import { codigoGenerico, todayISO } from './utils.js'

// Constantes e helpers compartilhados pelas telas do módulo Chromebook

export const STATUS_CHROMEBOOK = {
  disponivel: { label: 'Disponível', tom: 'verde' },
  emprestado: { label: 'Emprestado', tom: 'azul' },
  manutencao: { label: 'Em manutenção', tom: 'laranja' },
  baixado: { label: 'Baixado', tom: 'cinza' },
}

// Para Chromebook do aluno, "disponível" significa que está com o aluno
export function statusChromebook(cb) {
  if (cb?.propriedade === 'aluno' && cb.status === 'disponivel') return { label: 'Com o aluno', tom: 'verde' }
  return STATUS_CHROMEBOOK[cb?.status] || { label: cb?.status || '-', tom: 'cinza' }
}

export const TIPOS_QUEBRA = [
  { value: 'bateria', label: 'Bateria' },
  { value: 'tela', label: 'Tela' },
  { value: 'teclado', label: 'Teclado' },
  { value: 'outro', label: 'Outro' },
]

export function tiposQuebraLabel(tipos) {
  return (tipos || [])
    .map((t) => TIPOS_QUEBRA.find((q) => q.value === t)?.label || t)
    .join(', ') || '-'
}

export const STATUS_MANUTENCAO = {
  pendente: { label: 'Pendente', tom: 'cinza' },
  em_andamento: { label: 'Em andamento', tom: 'laranja' },
  finalizado: { label: 'Finalizado', tom: 'verde' },
}

export const RESPONSAVEL_CUSTO = {
  escola: 'Escola',
  familia: 'Família',
  garantia: 'Garantia',
}

export const STATUS_ALUNO = {
  ativo: { label: 'Ativo', tom: 'verde' },
  transferido: { label: 'Transferido', tom: 'cinza' },
  formado: { label: 'Formado', tom: 'azul' },
  inativo: { label: 'Inativo', tom: 'vermelho' },
}

export const TURNOS = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  integral: 'Integral',
}

// Situação de um empréstimo: em aberto, atrasado (passou da devolução prevista) ou devolvido
export function situacaoEmprestimo(e) {
  if (e.data_devolucao) return { key: 'devolvido', label: 'Devolvido', tom: 'cinza' }
  if (e.devolucao_prevista && e.devolucao_prevista < todayISO()) return { key: 'atrasado', label: 'Atrasado', tom: 'vermelho' }
  return { key: 'aberto', label: 'Em aberto', tom: 'azul' }
}

export function turmaLabel(t) {
  if (!t) return '-'
  return [t.nome, t.ano_letivo].filter(Boolean).join(' / ')
}

export function chromebookLabel(cb) {
  if (!cb) return '-'
  return [cb.numero_serie, cb.marca].filter(Boolean).join(' — ')
}

export const chromebookCodigo = (id) => codigoGenerico('CB', id)
export const manutencaoCodigo = (id) => codigoGenerico('MAN', id)
export const emprestimoCodigo = (id) => codigoGenerico('EMP', id)
export const alunoCodigo = (id) => codigoGenerico('ALU', id)
export const turmaCodigo = (id) => codigoGenerico('TUR', id)
