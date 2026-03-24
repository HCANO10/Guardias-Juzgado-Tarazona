"use client"

import { useState } from "react"
import { DSButton } from "@/lib/design-system"
import { FileDown, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { format, getDaysInMonth, addMonths, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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
}

export function ExportPDFButton({ guards, vacations, holidays }: ExportPDFButtonProps) {
  const [exporting, setExporting] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  // Mes seleccionado para el PDF (por defecto el mes actual)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const handleExport = async () => {
    setPopoverOpen(false)
    setExporting(true)
    const currentDate = selectedDate
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

  const monthLabel = format(selectedDate, 'MMMM yyyy', { locale: es })
    .replace(/^\w/, (c) => c.toUpperCase())

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <DSButton variant="secondary" size="sm" disabled={exporting}>
          {exporting
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <FileDown className="mr-2 h-4 w-4" />}
          Exportar PDF
        </DSButton>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-4 rounded-[16px] shadow-xl border-black/[0.08]" align="end">
        <p className="text-[12px] font-bold uppercase tracking-wider text-[#86868B] mb-3">
          Selecciona el mes
        </p>

        {/* Navegador mes/año */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setSelectedDate(d => subMonths(d, 1))}
            className="h-8 w-8 flex items-center justify-center rounded-[8px] hover:bg-[#F2F2F7] transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-neutral-700" />
          </button>

          <span className="text-[15px] font-semibold text-neutral-900 capitalize">
            {monthLabel}
          </span>

          <button
            type="button"
            onClick={() => setSelectedDate(d => addMonths(d, 1))}
            className="h-8 w-8 flex items-center justify-center rounded-[8px] hover:bg-[#F2F2F7] transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-neutral-700" />
          </button>
        </div>

        {/* Acceso rápido a los meses del año actual */}
        <div className="grid grid-cols-4 gap-1 mb-4">
          {Array.from({ length: 12 }, (_, i) => {
            const d = new Date(selectedDate.getFullYear(), i, 1)
            const isSelected = d.getMonth() === selectedDate.getMonth() &&
                               d.getFullYear() === selectedDate.getFullYear()
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={`h-8 rounded-[8px] text-[12px] font-semibold transition-colors capitalize
                  ${isSelected
                    ? 'bg-[#0066CC] text-white'
                    : 'hover:bg-[#F2F2F7] text-neutral-700'
                  }`}
              >
                {format(d, 'MMM', { locale: es })}
              </button>
            )
          })}
        </div>

        {/* Selector de año rápido */}
        <div className="flex items-center justify-between mb-4 bg-[#F2F2F7]/60 rounded-[10px] px-3 py-2">
          <button
            type="button"
            onClick={() => setSelectedDate(d => new Date(d.getFullYear() - 1, d.getMonth(), 1))}
            className="text-[13px] text-neutral-500 hover:text-neutral-900 font-bold transition-colors"
          >
            ‹ {selectedDate.getFullYear() - 1}
          </button>
          <span className="text-[14px] font-bold text-neutral-900">{selectedDate.getFullYear()}</span>
          <button
            type="button"
            onClick={() => setSelectedDate(d => new Date(d.getFullYear() + 1, d.getMonth(), 1))}
            className="text-[13px] text-neutral-500 hover:text-neutral-900 font-bold transition-colors"
          >
            {selectedDate.getFullYear() + 1} ›
          </button>
        </div>

        <DSButton className="w-full h-10 text-[14px] font-semibold gap-2" onClick={handleExport} disabled={exporting}>
          {exporting
            ? <><Loader2 className="h-4 w-4 animate-spin" />Generando…</>
            : <><FileDown className="h-4 w-4" />Generar PDF — {monthLabel}</>
          }
        </DSButton>
      </PopoverContent>
    </Popover>
  )
}
