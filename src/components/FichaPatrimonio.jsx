import { FaPrint, FaEdit, FaPaperclip, FaImage, FaCoins, FaMapMarkerAlt, FaHistory, FaExchangeAlt, FaExclamationTriangle } from 'react-icons/fa'
import Modal from './Modal.jsx'
import StatusBadge from './StatusBadge.jsx'
import { formatCurrency, formatDate, patrimonioCodigo } from '../lib/utils.js'

export default function FichaPatrimonio({
  patrimonio,
  fotoUrl,
  notaFiscalUrl,
  conservacoes,
  movimentacoes,
  quebrados,
  historicoLoading,
  onClose,
  onEdit,
  onAbrirNotaFiscal,
}) {
  if (!patrimonio) return null

  function handlePrint() {
    window.print()
  }

  return (
    <Modal
      title={`Ficha do Patrimônio — ${patrimonioCodigo(patrimonio.id)}`}
      onClose={onClose}
      maxWidth={860}
      headerActions={
        <>
          <button className="icon-btn" title="Imprimir ficha" onClick={handlePrint}>
            <FaPrint />
          </button>
          <button className="icon-btn" title="Editar" onClick={() => onEdit(patrimonio)}>
            <FaEdit />
          </button>
        </>
      }
      footer={
        <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
      }
    >
      <div className="print-area">
        <div className="ficha-top">
          <div className="ficha-photo">
            {fotoUrl ? (
              <img src={fotoUrl} alt={patrimonio.nome} />
            ) : (
              <div className="ficha-photo-placeholder"><FaImage size={30} /></div>
            )}
          </div>
          <div className="ficha-top-info">
            <div className="ficha-id">{patrimonioCodigo(patrimonio.id)}</div>
            <h2 className="ficha-nome">{patrimonio.nome}</h2>
            <div className="ficha-modelo">{patrimonio.modelo}</div>
            <StatusBadge status={patrimonio.status} />
            {patrimonio.fotoUrl && (
            <button
              className="btn btn-secondary btn-sm ficha-anexo-btn no-print"
              onClick={() => onAbrirNotaFiscal(patrimonio.fotoUrl)}
            >
              <FaPaperclip /> Ver Foto do produto
            </button>
          )}
          </div>
        </div>

        <div className="ficha-section">
          <div className="ficha-section-title"><FaCoins /> Dados de Aquisição</div>
          <div className="ficha-grid">
            <FichaItem label="Número de Série" value={patrimonio.numero_serie} />
            <FichaItem label="Tipo" value={patrimonio.tipos?.nome} />
            <FichaItem label="Nº Nota Fiscal" value={patrimonio.nota_fiscal_numero} />
            <FichaItem label="Fornecedor" value={patrimonio.fornecedores?.nome} />
            <FichaItem label="Data de Aquisição" value={formatDate(patrimonio.data_aquisicao)} />
            <FichaItem label="Vencimento da Garantia" value={formatDate(patrimonio.vencimento_garantia)} />
            <FichaItem label="Valor Original" value={formatCurrency(patrimonio.valor_original)} />
            <FichaItem label="Valor de Compra" value={formatCurrency(patrimonio.valor_compra)} />
          </div>
          {patrimonio.nota_fiscal_arquivo && (
            <button
              className="btn btn-secondary btn-sm ficha-anexo-btn no-print"
              onClick={() => onAbrirNotaFiscal(patrimonio.nota_fiscal_arquivo)}
            >
              <FaPaperclip /> Ver nota fiscal anexada
            </button>
          )}
        </div>

        <div className="ficha-section">
          <div className="ficha-section-title"><FaMapMarkerAlt /> Localização e Responsabilidade</div>
          <div className="ficha-grid">
            <FichaItem label="Unidade" value={patrimonio.unidades?.nome} />
            <FichaItem label="Setor" value={patrimonio.setores?.nome} />
            <FichaItem label="Responsável" value={patrimonio.responsaveis?.nome} />
          </div>
        </div>

        {patrimonio.observacao && (
          <div className="ficha-section">
            <div className="ficha-section-title">Observação</div>
            <p className="ficha-observacao">{patrimonio.observacao}</p>
          </div>
        )}

        <div className="ficha-section">
          <div className="ficha-section-title"><FaExclamationTriangle /> Histórico de Quebra</div>
          {historicoLoading ? (
            <div className="ficha-historico-vazio">Carregando...</div>
          ) : quebrados.length === 0 ? (
            <div className="ficha-historico-vazio">Nenhum registro de quebra.</div>
          ) : (
            <table className="data-table ficha-table">
              <thead>
                <tr><th>Data</th><th>Motivo</th><th>Observação</th></tr>
              </thead>
              <tbody>
                {quebrados.map((q) => (
                  <tr key={q.id}>
                    <td>{formatDate(q.data)}</td>
                    <td>{q.motivo || '-'}</td>
                    <td>{q.observacao || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="ficha-section">
          <div className="ficha-section-title"><FaHistory /> Histórico de Conservação de Bem</div>
          {historicoLoading ? (
            <div className="ficha-historico-vazio">Carregando...</div>
          ) : conservacoes.length === 0 ? (
            <div className="ficha-historico-vazio">Nenhum registro de conservação.</div>
          ) : (
            <table className="data-table ficha-table">
              <thead>
                <tr><th>Data</th><th>Valor</th><th>Estado</th><th>Observação</th></tr>
              </thead>
              <tbody>
                {conservacoes.map((c) => (
                  <tr key={c.id}>
                    <td>{formatDate(c.data)}</td>
                    <td>{formatCurrency(c.valor)}</td>
                    <td>{c.estado_conservacao || '-'}</td>
                    <td>{c.observacao || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="ficha-section">
          <div className="ficha-section-title"><FaExchangeAlt /> Histórico de Movimentação</div>
          {historicoLoading ? (
            <div className="ficha-historico-vazio">Carregando...</div>
          ) : movimentacoes.length === 0 ? (
            <div className="ficha-historico-vazio">Nenhuma movimentação registrada.</div>
          ) : (
            <table className="data-table ficha-table">
              <thead>
                <tr><th>Data</th><th>De</th><th>Para</th><th>Motivo</th></tr>
              </thead>
              <tbody>
                {movimentacoes.map((m) => (
                  <tr key={m.id}>
                    <td>{formatDate(m.data)}</td>
                    <td>{m.unidade_origem?.nome || '-'} / {m.setor_origem?.nome || '-'}</td>
                    <td>{m.unidade_destino?.nome || '-'} / {m.setor_destino?.nome || '-'}</td>
                    <td>{m.motivo || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  )
}

function FichaItem({ label, value }) {
  return (
    <div className="ficha-item">
      <span className="ficha-item-label">{label}</span>
      <span className="ficha-item-value">{value || '-'}</span>
    </div>
  )
}