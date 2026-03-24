"use client"

import { useState } from "react"
import { DSButton } from "@/lib/design-system"
import { FileDown, Loader2 } from "lucide-react"
import { format, getDaysInMonth } from "date-fns"
import { es } from "date-fns/locale"
import { buildFullName } from "@/lib/staff/normalize"

interface PDFStaffMember {
  id: string
  first_name: string
  last_name: string
  second_last_name?: string | null
}

interface PDFGuardPeriod {
  week_number: number
  start_date: string
  end_date: string
}

interface PDFGuardAssignment {
  staff_id: string
}

interface PDFGuard {
  id: string
  guard_periods?: PDFGuardPeriod | null
  assignments?: PDFGuardAssignment[]
}

interface PDFVacation {
  id: string
  staff_id: string
  start_date: string
  end_date: string
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

export function ExportPDFButton({ guards, vacations, holidays, staff, currentDate = new Date() }: ExportPDFButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new (jsPDF as unknown as new (opts: Record<string, string>) => InstanceType<typeof jsPDF>)({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      const monthName = format(currentDate, 'MMMM yyyy', { locale: es }).toUpperCase()
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const daysInMonth = getDaysInMonth(currentDate)

      // Título
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(`CUADRANTE DE GUARDIAS - ${monthName}`, 148, 15, { align: 'center' })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Juzgado de Tarazona', 148, 22, { align: 'center' })

      // Obtener guardias del mes
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
      const monthGuards = guards.filter((g) => {
        const gMonth = g.guard_periods?.start_date?.slice(0, 7)
        return gMonth === monthStr
      })

      // Tabla de guardias
      const guardRows = monthGuards.map((g) => {
        const period = g.guard_periods
        const assignedStaff = g.assignments?.map((a) => {
          const s = staff.find((p) => p.id === a.staff_id)
          return s ? buildFullName(s) : '—'
        }).join('\n') || '—'
        return [
          `Sem. ${period?.week_number || '?'}`,
          period?.start_date ? format(new Date(period.start_date + 'T00:00:00'), 'dd/MM/yyyy') : '—',
          period?.end_date ? format(new Date(period.end_date + 'T00:00:00'), 'dd/MM/yyyy') : '—',
          assignedStaff,
        ]
      })

      autoTable(doc, {
        startY: 28,
        head: [['Semana', 'Inicio (Viernes)', 'Fin (Jueves)', 'Personal asignado']],
        body: guardRows.length > 0 ? guardRows : [['—', '—', '—', 'Sin guardias en este mes']],
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 248, 255] },
        margin: { left: 10, right: 10 },
      })

      // Festivos del mes
      const monthHolidays = holidays.filter((h) => h.date?.slice(0, 7) === monthStr)
      if (monthHolidays.length > 0) {
        const lastY = ((doc as unknown as Record<string, { finalY?: number }>).lastAutoTable?.finalY ?? 42) + 8
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('FESTIVOS DEL MES', 10, lastY)
        autoTable(doc, {
          startY: lastY + 4,
          head: [['Fecha', 'Festivo', 'Ámbito']],
          body: monthHolidays.map((h: PDFHoliday) => [
            h.date ? format(new Date(h.date + 'T00:00:00'), 'dd/MM/yyyy') : '—',
            h.name || '—',
            h.scope || '—',
          ]),
          headStyles: { fillColor: [251, 191, 36], textColor: 0 },
          margin: { left: 10, right: 10 },
        })
      }

      // Nota final
      const finalY = ((doc as unknown as Record<string, { finalY?: number }>).lastAutoTable?.finalY ?? 114) + 6
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`, 148, finalY, { align: 'center' })

      doc.save(`cuadrante_guardias_${monthStr}.pdf`)
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
