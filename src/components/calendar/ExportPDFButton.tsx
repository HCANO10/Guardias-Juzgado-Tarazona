"use client"

import { useState } from "react"
import { DSButton } from "@/lib/design-system"
import { FileDown, Loader2 } from "lucide-react"
import { format, getDaysInMonth } from "date-fns"
import { es } from "date-fns/locale"

interface PDFStaffMember {
  id: string
  first_name: string
  last_name: string
  second_last_name?: string | null
}

// Guard data shape as produced by formattedGuards in calendar/page.tsx
interface PDFGuard {
  id: string
  week_number: number
  start_date: string
  end_date: string
  auxilio: { id: string; first_name: string; last_name: string } | null
  tramitador: { id: string; first_name: string; last_name: string } | null
  gestor: { id: string; first_name: string; last_name: string } | null
}

interface PDFVacation {
  id: string
  staff_id: string
  start_date: string
  end_date: string
  tipo?: string | null
  staff?: { id: string; first_name: string; last_name: string } | null
}

interface PDFHoliday {
  id: string
  date: string
  name: string
  scope: string
}

interface ExportPDFButtonProps {
  guards: PDFGuard[]
  vacations: PDFVacation[]
  holidays: PDFHoliday[]
  staff: PDFStaffMember[]
  currentDate?: Date
}

export function ExportPDFButton({ guards, vacations, holidays, currentDate = new Date() }: ExportPDFButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new (jsPDF as unknown as new (opts: Record<string, string>) => InstanceType<typeof jsPDF>)({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const monthName = format(currentDate, 'MMMM yyyy', { locale: es }).toUpperCase()
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`

      // ── Cabecera ──────────────────────────────────────────────────────────
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(`CALENDARIO UNIFICADO - ${monthName}`, 148, 15, { align: 'center' })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Juzgado de Tarazona', 148, 22, { align: 'center' })

      // ── 1. GUARDIAS del mes ───────────────────────────────────────────────
      // Filtra por semanas cuyo inicio o fin caiga en el mes visualizado
      const monthGuards = guards.filter((g) => {
        const startMonth = g.start_date?.slice(0, 7)
        const endMonth   = g.end_date?.slice(0, 7)
        return startMonth === monthStr || endMonth === monthStr
      })

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('GUARDIAS', 10, 30)

      const guardRows = monthGuards.map((g) => {
        const formatDate = (d: string) =>
          d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy') : '—'
        return [
          `Sem. ${g.week_number ?? '?'}`,
          formatDate(g.start_date),
          formatDate(g.end_date),
          g.gestor    ? `${g.gestor.first_name} ${g.gestor.last_name}`       : '—',
          g.tramitador ? `${g.tramitador.first_name} ${g.tramitador.last_name}` : '—',
          g.auxilio   ? `${g.auxilio.first_name} ${g.auxilio.last_name}`     : '—',
        ]
      })

      autoTable(doc, {
        startY: 33,
        head: [['Semana', 'Inicio (Vie)', 'Fin (Jue)', 'Gestor/a', 'Tramitador/a', 'Auxilio']],
        body: guardRows.length > 0
          ? guardRows
          : [['—', '—', '—', '—', '—', 'Sin guardias en este mes']],
        headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [254, 242, 242] },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 26 },
          2: { cellWidth: 26 },
          3: { cellWidth: 50 },
          4: { cellWidth: 50 },
          5: { cellWidth: 50 },
        },
        margin: { left: 10, right: 10 },
      })

      // ── 2. VACACIONES Y ASUNTOS PROPIOS del mes ───────────────────────────
      // Incluye cualquier vacación que solape con el mes actual
      const monthStart = new Date(year, month, 1)
      const monthEnd   = new Date(year, month, getDaysInMonth(currentDate))

      const monthVacations = vacations.filter((v) => {
        if (!v.start_date || !v.end_date) return false
        const vStart = new Date(v.start_date + 'T00:00:00')
        const vEnd   = new Date(v.end_date   + 'T00:00:00')
        return vStart <= monthEnd && vEnd >= monthStart
      })

      const lastGuardY = ((doc as unknown as Record<string, { finalY?: number }>).lastAutoTable?.finalY ?? 50) + 8

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('VACACIONES Y ASUNTOS PROPIOS', 10, lastGuardY)

      const tipoLabel = (tipo?: string | null) => {
        if (tipo === 'asuntos_propios') return 'Asuntos propios'
        return 'Vacaciones'
      }

      const vacRows = monthVacations.map((v) => {
        const staffName = v.staff
          ? `${v.staff.first_name} ${v.staff.last_name}`
          : '—'
        const formatDate = (d: string) =>
          d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy') : '—'
        return [
          staffName,
          tipoLabel(v.tipo),
          formatDate(v.start_date),
          formatDate(v.end_date),
        ]
      })

      autoTable(doc, {
        startY: lastGuardY + 4,
        head: [['Personal', 'Tipo', 'Inicio', 'Fin']],
        body: vacRows.length > 0
          ? vacRows
          : [['—', '—', '—', 'Sin ausencias registradas en este mes']],
        headStyles: { fillColor: [52, 199, 89], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 40 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 },
        },
        margin: { left: 10, right: 10 },
      })

      // ── 3. FESTIVOS del mes ───────────────────────────────────────────────
      const monthHolidays = holidays.filter((h) => h.date?.slice(0, 7) === monthStr)

      if (monthHolidays.length > 0) {
        const lastVacY = ((doc as unknown as Record<string, { finalY?: number }>).lastAutoTable?.finalY ?? 100) + 8

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('FESTIVOS DEL MES', 10, lastVacY)

        autoTable(doc, {
          startY: lastVacY + 4,
          head: [['Fecha', 'Festivo', 'Ámbito']],
          body: monthHolidays.map((h: PDFHoliday) => [
            h.date ? format(new Date(h.date + 'T00:00:00'), 'dd/MM/yyyy') : '—',
            h.name || '—',
            h.scope ? h.scope.charAt(0).toUpperCase() + h.scope.slice(1) : '—',
          ]),
          headStyles: { fillColor: [251, 191, 36], textColor: 0, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [255, 251, 235] },
          margin: { left: 10, right: 10 },
        })
      }

      // ── Pie de página ─────────────────────────────────────────────────────
      const finalY = ((doc as unknown as Record<string, { finalY?: number }>).lastAutoTable?.finalY ?? 150) + 8
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(130, 130, 130)
      doc.text(
        `Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })} · Juzgado de Tarazona`,
        148,
        finalY,
        { align: 'center' },
      )

      doc.save(`calendario_unificado_${monthStr}.pdf`)
    } catch (err) {
      console.error('Error exportando PDF:', err)
      alert('Error al generar el PDF. Inténtalo de nuevo.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <DSButton variant="secondary" size="sm" onClick={handleExport} disabled={exporting}>
      {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
      Exportar PDF
    </DSButton>
  )
}
