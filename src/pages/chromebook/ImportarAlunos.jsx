import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { cpfValido, lerArquivoTexto, normalizarTexto, parseCSV } from '../../lib/utils.js'
import Modal from '../../components/Modal.jsx'
import Badge from '../../components/Badge.jsx'

const ANO_ATUAL = new Date().getFullYear()

// Nomes de coluna aceitos no cabeçalho do CSV (sem acento, minúsculo)
const COLUNAS = {
  nome: ['nome', 'nome completo', 'aluno', 'nome do aluno'],
  cpf: ['cpf'],
  matricula: ['matricula', 'ra', 'registro'],
  turma: ['turma', 'classe', 'sala'],
}

/**
 * Importação de alunos por planilha CSV (Excel: "Salvar como" > CSV).
 * Colunas: nome (obrigatória), cpf, matricula, turma.
 * Alunos que já existem (mesma matrícula ou CPF) são atualizados.
 * Turmas que não existem no ano atual são criadas automaticamente.
 */
export default function ImportarAlunos({ alunos, turmas, onClose, onImportado }) {
  const [linhas, setLinhas] = useState(null)
  const [erroArquivo, setErroArquivo] = useState('')
  const [importando, setImportando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleArquivo(e) {
    const file = e.target.files?.[0]
    setErroArquivo('')
    setLinhas(null)
    if (!file) return

    const dados = parseCSV(await lerArquivoTexto(file))
    if (dados.length < 2) { setErroArquivo('A planilha está vazia ou só tem o cabeçalho.'); return }

    const cabecalho = dados[0].map(normalizarTexto)
    const indice = {}
    for (const [campo, nomes] of Object.entries(COLUNAS)) {
      indice[campo] = cabecalho.findIndex((c) => nomes.includes(c))
    }
    if (indice.nome < 0) {
      setErroArquivo('Não encontrei a coluna "nome" no cabeçalho da planilha.')
      return
    }

    setLinhas(dados.slice(1).map((l) => ({
      nome: l[indice.nome] || '',
      cpf: indice.cpf >= 0 ? (l[indice.cpf] || '').replace(/\D/g, '') : '',
      matricula: indice.matricula >= 0 ? l[indice.matricula] || '' : '',
      turma: indice.turma >= 0 ? l[indice.turma] || '' : '',
    })))
  }

  // Valida cada linha e descobre se é inclusão ou atualização
  const analise = useMemo(() => {
    if (!linhas) return null
    const porMatricula = new Map(alunos.filter((a) => a.matricula).map((a) => [normalizarTexto(a.matricula), a]))
    const porCpf = new Map(alunos.filter((a) => a.cpf).map((a) => [a.cpf, a]))
    const vistos = new Set()
    const turmasNovas = new Set()
    const turmasDoAno = new Map(
      turmas.filter((t) => t.ano_letivo === ANO_ATUAL).map((t) => [normalizarTexto(t.nome), t])
    )

    const itens = linhas.map((l) => {
      let problema = ''
      if (!l.nome.trim()) problema = 'Sem nome'
      else if (l.cpf && !cpfValido(l.cpf)) problema = 'CPF inválido'

      const chave = l.matricula ? 'm:' + normalizarTexto(l.matricula) : l.cpf ? 'c:' + l.cpf : null
      if (!problema && chave && vistos.has(chave)) problema = 'Repetido na planilha'
      if (chave) vistos.add(chave)

      const existente = (l.matricula && porMatricula.get(normalizarTexto(l.matricula))) || (l.cpf && porCpf.get(l.cpf)) || null
      if (l.turma && !turmasDoAno.has(normalizarTexto(l.turma))) turmasNovas.add(l.turma.trim())

      return { ...l, problema, existente }
    })

    return {
      itens,
      validos: itens.filter((i) => !i.problema),
      novos: itens.filter((i) => !i.problema && !i.existente).length,
      atualizados: itens.filter((i) => !i.problema && i.existente).length,
      invalidos: itens.filter((i) => i.problema).length,
      turmasNovas: Array.from(turmasNovas),
      turmasDoAno,
    }
  }, [linhas, alunos, turmas])

  async function handleImportar() {
    setImportando(true)
    setErro('')
    try {
      // 1. Cria as turmas que faltam (no ano letivo atual)
      const turmaIds = new Map(Array.from(analise.turmasDoAno.entries()).map(([k, t]) => [k, t.id]))
      const nomesTurmasNovas = Array.from(new Set(analise.turmasNovas.map((t) => normalizarTexto(t))))
        .map((n) => analise.turmasNovas.find((t) => normalizarTexto(t) === n))
      if (nomesTurmasNovas.length) {
        const { data, error } = await supabase
          .from('turmas')
          .insert(nomesTurmasNovas.map((nome) => ({ nome, ano_letivo: ANO_ATUAL })))
          .select('id, nome')
        if (error) throw error
        data.forEach((t) => turmaIds.set(normalizarTexto(t.nome), t.id))
      }

      const montar = (i) => ({
        nome: i.nome.trim(),
        cpf: i.cpf || null,
        matricula: i.matricula.trim() || null,
        turma_id: i.turma ? turmaIds.get(normalizarTexto(i.turma)) || null : null,
      })

      // 2. Inclui os alunos novos de uma vez
      const novos = analise.validos.filter((i) => !i.existente).map(montar)
      if (novos.length) {
        const { error } = await supabase.from('alunos').insert(novos)
        if (error) throw error
      }

      // 3. Atualiza os que já existiam (nome e turma; CPF/matrícula só se estavam vazios)
      for (const i of analise.validos.filter((v) => v.existente)) {
        const dados = montar(i)
        const payload = { nome: dados.nome }
        if (i.turma) payload.turma_id = dados.turma_id
        if (!i.existente.cpf && dados.cpf) payload.cpf = dados.cpf
        if (!i.existente.matricula && dados.matricula) payload.matricula = dados.matricula
        const { error } = await supabase.from('alunos').update(payload).eq('id', i.existente.id)
        if (error) throw error
      }

      onImportado()
    } catch (err) {
      setErro(
        err.message?.includes('duplicate')
          ? 'Algum CPF ou matrícula da planilha já pertence a outro aluno. Confira os dados e tente de novo.'
          : err.message || 'Erro ao importar.'
      )
    } finally {
      setImportando(false)
    }
  }

  return (
    <Modal
      title="Importar Alunos (CSV)"
      onClose={onClose}
      maxWidth={860}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleImportar}
            disabled={!analise || analise.validos.length === 0 || importando}
          >
            {importando ? 'Importando...' : analise ? `Importar ${analise.validos.length} aluno(s)` : 'Importar'}
          </button>
        </>
      }
    >
      <div className="alert alert-info">
        No Excel, use <strong>Arquivo &gt; Salvar como &gt; CSV</strong>. A primeira linha deve ter os nomes das colunas:
        <strong> nome</strong> (obrigatória), <strong>cpf</strong>, <strong>matricula</strong> e <strong>turma</strong>.
        Alunos que já existem (mesma matrícula ou CPF) são atualizados. Turmas que não existirem em {ANO_ATUAL} serão criadas.
      </div>

      <div className="field full secao-campo">
        <label>Arquivo CSV</label>
        <input type="file" accept=".csv,text/csv" onChange={handleArquivo} />
      </div>

      {erroArquivo && <div className="alert alert-error">{erroArquivo}</div>}
      {erro && <div className="alert alert-error">{erro}</div>}

      {analise && (
        <>
          <div className="importar-resumo">
            <Badge tom="verde">{analise.novos} novo(s)</Badge>
            <Badge tom="azul">{analise.atualizados} atualizado(s)</Badge>
            {analise.invalidos > 0 && <Badge tom="vermelho">{analise.invalidos} com problema (serão ignorados)</Badge>}
            {analise.turmasNovas.length > 0 && <Badge tom="laranja">Turmas novas: {analise.turmasNovas.join(', ')}</Badge>}
          </div>
          <div className="table-wrap table-wrap-curta">
            <table className="data-table">
              <thead><tr><th>Nome</th><th>CPF</th><th>Matrícula</th><th>Turma</th><th>Situação</th></tr></thead>
              <tbody>
                {analise.itens.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.nome || '-'}</td>
                    <td>{i.cpf || '-'}</td>
                    <td>{i.matricula || '-'}</td>
                    <td>{i.turma || '-'}</td>
                    <td>
                      {i.problema ? <Badge tom="vermelho">{i.problema}</Badge>
                        : i.existente ? <Badge tom="azul">Atualizar</Badge>
                        : <Badge tom="verde">Novo</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  )
}
