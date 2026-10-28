import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoUrl from '../assets/logo-branco.png'
import { getUsuarioLogado } from './auth.js'

const AZUL = [0, 0, 69] // #000045
const AZUL_ROYAL = [37, 99, 235] // #2563EB
const LARANJA = [255, 84, 0] // #FF5400
const CINZA_TEXTO = [90, 93, 114]
const CINZA_BORDA = [227, 229, 238]
const CINZA_BG = [244, 245, 249]

const ALTURA_CABECALHO = 78
const MARGEM = 30

// A logo tem bastante área transparente em volta; recorta só a parte desenhada
// para ela ficar do tamanho certo no cabeçalho. Carrega uma vez só.
let logoPromise = null
function carregarLogo() {
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)

        let minX = width, minY = height, maxX = -1, maxY = -1
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 10) {
              if (x < minX) minX = x
              if (x > maxX) maxX = x
              if (y < minY) minY = y
              if (y > maxY) maxY = y
            }
          }
        }
        if (maxX < 0) { resolve(null); return }

        const recorte = document.createElement('canvas')
        recorte.width = maxX - minX + 1
        recorte.height = maxY - minY + 1
        recorte.getContext('2d').drawImage(canvas, minX, minY, recorte.width, recorte.height, 0, 0, recorte.width, recorte.height)
        resolve({ dataUrl: recorte.toDataURL('image/png'), proporcao: recorte.width / recorte.height })
      }
      img.onerror = () => resolve(null)
      img.src = logoUrl
    })
  }
  return logoPromise
}

// Faixa com degradê horizontal azul-escuro -> azul royal (jsPDF não tem degradê nativo)
function desenharDegrade(doc, x, y, largura, altura) {
  const faixas = 80
  const passo = largura / faixas
  for (let i = 0; i < faixas; i++) {
    const t = i / (faixas - 1)
    const cor = AZUL.map((c, k) => Math.round(c + (AZUL_ROYAL[k] - c) * t))
    doc.setFillColor(...cor)
    doc.rect(x + i * passo, y, passo + 0.5, altura, 'F')
  }
}

function desenharCabecalho(doc, { title, subtitle, logo, emitidoEm, emitidoPor }) {
  const largura = doc.internal.pageSize.getWidth()

  desenharDegrade(doc, 0, 0, largura, ALTURA_CABECALHO)
  doc.setFillColor(...LARANJA)
  doc.rect(0, ALTURA_CABECALHO, largura, 3, 'F')

  // Logo + divisória
  let xTexto = MARGEM
  if (logo) {
    const alturaLogo = 40
    const larguraLogo = Math.min(alturaLogo * logo.proporcao, 120)
    doc.addImage(logo.dataUrl, 'PNG', MARGEM, (ALTURA_CABECALHO - larguraLogo / logo.proporcao) / 2, larguraLogo, larguraLogo / logo.proporcao)
    xTexto = MARGEM + larguraLogo + 16
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.6)
    doc.line(xTexto - 8, 20, xTexto - 8, ALTURA_CABECALHO - 20)
  }

  // Título e subtítulo
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text(title, xTexto, 36)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(210, 222, 255)
  doc.text(subtitle || 'Sistema de Gestão', xTexto, 53)

  // Dados de emissão à direita
  doc.setFontSize(8.5)
  doc.setTextColor(210, 222, 255)
  doc.text('EMITIDO EM', largura - MARGEM, 30, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text(emitidoEm, largura - MARGEM, 43, { align: 'right' })
  if (emitidoPor) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(210, 222, 255)
    doc.text(`por ${emitidoPor}`, largura - MARGEM, 56, { align: 'right' })
  }
}

function desenharRodape(doc, pagina, total) {
  const largura = doc.internal.pageSize.getWidth()
  const altura = doc.internal.pageSize.getHeight()
  doc.setDrawColor(...CINZA_BORDA)
  doc.setLineWidth(0.6)
  doc.line(MARGEM, altura - 30, largura - MARGEM, altura - 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...CINZA_TEXTO)
  doc.text('Fanex · Sistema de Gestão — Patrimônio e Chromebooks', MARGEM, altura - 16)
  doc.text(`Página ${pagina} de ${total}`, largura - MARGEM, altura - 16, { align: 'right' })
}

// Caixa de destaque (quantidade de registros e totais) logo abaixo do cabeçalho
function desenharResumo(doc, itens, y) {
  let x = MARGEM
  itens.forEach(({ rotulo, valor }) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    const larguraValor = doc.getTextWidth(valor)
    doc.setFontSize(7.5)
    const larguraRotulo = doc.getTextWidth(rotulo.toUpperCase())
    const largura = Math.max(larguraValor, larguraRotulo) + 28

    doc.setFillColor(...CINZA_BG)
    doc.setDrawColor(...CINZA_BORDA)
    doc.roundedRect(x, y, largura, 40, 5, 5, 'FD')
    doc.setFillColor(...LARANJA)
    doc.rect(x, y + 6, 3, 28, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...CINZA_TEXTO)
    doc.text(rotulo.toUpperCase(), x + 14, y + 15)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...AZUL)
    doc.text(valor, x + 14, y + 31)
    x += largura + 10
  })
}

/**
 * Gera e baixa um PDF com cabeçalho da marca (logo + degradê), resumo e tabela.
 * totalsText: texto opcional de total ("Valor total: R$ ..."), mostrado no resumo.
 * resumo: substitui as caixas de resumo ([{ rotulo, valor }]); [] para não mostrar.
 */
export async function exportToPDF({ title, subtitle, columns, rows, filename, totalsText, resumo: resumoInformado }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const logo = await carregarLogo()
  const usuario = getUsuarioLogado()
  const cabecalho = {
    title,
    subtitle,
    logo,
    emitidoEm: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    emitidoPor: usuario?.nome || '',
  }

  const resumo = resumoInformado || [{ rotulo: 'Registros', valor: String(rows.length) }]
  if (totalsText && !resumoInformado) {
    const [rotulo, ...resto] = totalsText.split(':')
    resumo.push(resto.length ? { rotulo: rotulo.trim(), valor: resto.join(':').trim() } : { rotulo: 'Total', valor: totalsText })
  }
  const yResumo = ALTURA_CABECALHO + 18
  desenharResumo(doc, resumo, yResumo)

  autoTable(doc, {
    startY: resumo.length ? yResumo + 56 : yResumo,
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? '-'))),
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
      textColor: [33, 34, 59],
      lineColor: CINZA_BORDA,
      lineWidth: 0.5,
      valign: 'middle',
    },
    headStyles: {
      fillColor: AZUL,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: AZUL,
    },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    // Nas páginas seguintes a tabela começa logo abaixo do cabeçalho
    margin: { left: MARGEM, right: MARGEM, top: ALTURA_CABECALHO + 20, bottom: 44 },
    didDrawPage: () => desenharCabecalho(doc, cabecalho),
  })

  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    desenharRodape(doc, i, total)
  }

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
