import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils.js'
import {
  RESPONSAVEL_CUSTO, STATUS_MANUTENCAO, chromebookCodigo, situacaoEmprestimo,
  statusChromebook, tiposQuebraLabel, turmaLabel,
} from '../../lib/chromebook.js'
import Modal from '../../components/Modal.jsx'
import Badge from '../../components/Badge.jsx'
import { FaPrint, FaHandHolding, FaTools, FaLaptop } from 'react-icons/fa'

// Ficha do Chromebook: dados do aparelho + histórico de empréstimos e manutenções
export default function FichaChromebook({ chromebookId, onClose }) {
  const [cb, setCb] = useState(null)
  const [emprestimos, setEmprestimos] = useState([])
  const [manutencoes, setManutencoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [cbRes, empRes, manRes] = await Promise.all([
        supabase.from('chromebooks').select('*, alunos(id,nome,turmas(nome,ano_letivo))').eq('id', chromebookId).maybeSingle(),
        supabase.from('emprestimos').select('*, alunos(id,nome)').eq('chromebook_id', chromebookId).order('data_retirada', { ascending: false }),
        supabase.from('manutencoes').select('*, alunos(id,nome)').eq('chromebook_id', chromebookId).order('data_ida', { ascending: false }),
      ])
      if (cbRes.error) setError(cbRes.error.message)
      setCb(cbRes.data)
      setEmprestimos(empRes.data || [])
      setManutencoes(manRes.data || [])
      setLoading(false)
    }
    load()
  }, [chromebookId])

  const st = cb ? statusChromebook(cb) : null

  return (
    <Modal
      title={cb ? `Ficha do Chromebook — ${chromebookCodigo(cb.id)}` : 'Ficha do Chromebook'}
      onClose={onClose}
      maxWidth={860}
      headerActions={
        <button className="icon-btn" title="Imprimir ficha" onClick={() => window.print()}><FaPrint /></button>
      }
      footer={<button className="btn btn-secondary" onClick={onClose}>Fechar</button>}
    >
      {loading ? (
        <div className="loading-state">Carregando...</div>
      ) : error || !cb ? (
        <div className="alert alert-error">{error || 'Chromebook não encontrado.'}</div>
      ) : (
        <div className="print-area">
          <div className="ficha-top">
            <div className="ficha-photo"><div className="ficha-photo-placeholder"><FaLaptop size={30} /></div></div>
            <div className="ficha-top-info">
              <div className="ficha-id">{chromebookCodigo(cb.id)}</div>
              <h2 className="ficha-nome">{cb.numero_serie}</h2>
              <div className="ficha-modelo">{cb.marca || 'Marca não informada'} · {cb.propriedade === 'aluno' ? 'Do aluno' : 'Da escola'}</div>
              <Badge tom={st.tom}>{st.label}</Badge>
            </div>
          </div>

          <div className="ficha-section">
            <div className="ficha-section-title"><FaLaptop /> Dados</div>
            <div className="ficha-grid">
              <div className="ficha-item"><div className="ficha-item-label">Nº de Série</div><div className="ficha-item-value">{cb.numero_serie}</div></div>
              <div className="ficha-item"><div className="ficha-item-label">Marca</div><div className="ficha-item-value">{cb.marca || '-'}</div></div>
              {cb.propriedade === 'aluno' && (
                <>
                  <div className="ficha-item"><div className="ficha-item-label">Aluno</div><div className="ficha-item-value">{cb.alunos?.nome || '-'}</div></div>
                  <div className="ficha-item"><div className="ficha-item-label">Turma</div><div className="ficha-item-value">{turmaLabel(cb.alunos?.turmas)}</div></div>
                </>
              )}
              <div className="ficha-item"><div className="ficha-item-label">Cadastrado em</div><div className="ficha-item-value">{formatDateTime(cb.created_at)}</div></div>
            </div>
            {cb.observacao && <div className="ficha-observacao">{cb.observacao}</div>}
          </div>

          {cb.propriedade === 'escola' && (
            <div className="ficha-section">
              <div className="ficha-section-title"><FaHandHolding /> Empréstimos ({emprestimos.length})</div>
              {emprestimos.length === 0 ? (
                <div className="ficha-historico-vazio">Nenhum empréstimo registrado.</div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table ficha-table">
                    <thead><tr><th>Aluno</th><th>Retirada</th><th>Prevista</th><th>Devolução</th><th>Situação</th></tr></thead>
                    <tbody>
                      {emprestimos.map((e) => {
                        const s = situacaoEmprestimo(e)
                        return (
                          <tr key={e.id}>
                            <td>{e.alunos?.nome || '-'}</td>
                            <td>{formatDate(e.data_retirada)}</td>
                            <td>{formatDate(e.devolucao_prevista)}</td>
                            <td>{formatDate(e.data_devolucao)}</td>
                            <td><Badge tom={s.tom}>{s.label}</Badge></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="ficha-section">
            <div className="ficha-section-title"><FaTools /> Manutenções ({manutencoes.length})</div>
            {manutencoes.length === 0 ? (
              <div className="ficha-historico-vazio">Nenhuma manutenção registrada.</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table ficha-table">
                  <thead><tr><th>Ida</th><th>Retorno</th><th>Quebra</th><th>Ticket Geekie</th><th>Custo</th><th>Status</th></tr></thead>
                  <tbody>
                    {manutencoes.map((m) => {
                      const s = STATUS_MANUTENCAO[m.status]
                      return (
                        <tr key={m.id}>
                          <td>{formatDate(m.data_ida)}</td>
                          <td>{formatDate(m.data_retorno)}</td>
                          <td>{tiposQuebraLabel(m.tipos_quebra)}</td>
                          <td>{m.ticket_geekie}</td>
                          <td>{m.custo != null ? `${formatCurrency(m.custo)}${m.responsavel_custo ? ` (${RESPONSAVEL_CUSTO[m.responsavel_custo]})` : ''}` : '-'}</td>
                          <td><Badge tom={s?.tom}>{s?.label || m.status}</Badge></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
