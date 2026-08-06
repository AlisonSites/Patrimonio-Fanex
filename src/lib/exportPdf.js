import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const AZUL = [0, 0, 69] // #000045
const LARANJA = [255, 84, 0] // #FF5400

export function exportToPDF({ title, subtitle, columns, rows, filename, totalsText }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Cabeçalho
  doc.setFillColor(...AZUL)
  doc.rect(0, 0, pageWidth, 60, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 30, 28)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitle || 'Sistema de Controle de Patrimônio Escolar', 30, 45)

  doc.setTextColor(...LARANJA)
  doc.setFontSize(9)
  doc.text(new Date().toLocaleString('pt-BR'), pageWidth - 150, 45)

  autoTable(doc, {
    startY: 75,
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((c) => row[c.key] ?? '-')),
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 246, 250] },
    margin: { left: 30, right: 30 },
  })

  if (totalsText) {
    const finalY = doc.lastAutoTable.finalY || 75
    doc.setTextColor(...AZUL)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(totalsText, 30, finalY + 25)
  }

  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - 90,
      doc.internal.pageSize.getHeight() - 15
    )
  }

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
