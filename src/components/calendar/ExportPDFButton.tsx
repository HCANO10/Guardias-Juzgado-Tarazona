"use client"

import { useState } from "react"
import { DSButton } from "@/lib/design-system"
import { FileDown, Loader2, ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { format, addMonths, subMonths, getDaysInMonth, eachMonthOfInterval } from "date-fns"
import { es } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface PDFStaffMember {
  id: string
  first_name: string
  last_name: string
  second_last_name?: string | null
}

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
  /** If set, the PDF will show this person's name instead of "Todos los trabajadores" */
  filterLabel?: string
}

function MonthPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: Date
  onChange: (d: Date) => void
}) {
  const monthLabel = format(value, 'MMMM yyyy', { locale: es })
    .replace(/^\w/, (c) => c.toUpperCase())

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{label}</p>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => onChange(subMonths(value, 1))}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5 text-slate-600" />
        </button>
        <span className="text-[13px] font-semibold text-slate-800 capitalize">{monthLabel}</span>
        <button
          type="button"
          onClick={() => onChange(addMonths(value, 1))}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: 12 }, (_, i) => {
          const d = new Date(value.getFullYear(), i, 1)
          const isSelected = d.getMonth() === value.getMonth() && d.getFullYear() === value.getFullYear()
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(d)}
              className={`h-7 rounded-lg text-[11px] font-semibold transition-colors capitalize ${
                isSelected ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              {format(d, 'MMM', { locale: es })}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-2 bg-slate-50 rounded-lg px-2 py-1">
        <button
          type="button"
          onClick={() => onChange(new Date(value.getFullYear() - 1, value.getMonth(), 1))}
          className="text-[11px] text-slate-500 hover:text-slate-800 font-bold transition-colors"
        >
          ‹ {value.getFullYear() - 1}
        </button>
        <span className="text-[12px] font-bold text-slate-800">{value.getFullYear()}</span>
        <button
          type="button"
          onClick={() => onChange(new Date(value.getFullYear() + 1, value.getMonth(), 1))}
          className="text-[11px] text-slate-500 hover:text-slate-800 font-bold transition-colors"
        >
          {value.getFullYear() + 1} ›
        </button>
      </div>
    </div>
  )
}

export function ExportPDFButton({ guards, vacations, holidays, filterLabel }: ExportPDFButtonProps) {
  const [exporting, setExporting] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), 0, 1) // Enero del año actual
  })
  const [toDate, setToDate] = useState<Date>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), 11, 1) // Diciembre del año actual
  })

  // Corrige automáticamente si from > to
  const handleFromChange = (d: Date) => {
    setFromDate(d)
    if (d > toDate) setToDate(d)
  }
  const handleToChange = (d: Date) => {
    setToDate(d)
    if (d < fromDate) setFromDate(d)
  }

  const formatDate = (d: string) =>
    d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy') : '—'

  const tipoLabel = (tipo?: string | null) =>
    tipo === 'asuntos_propios' ? 'Asuntos propios' : 'Vacaciones'

  const handleExport = async () => {
    setPopoverOpen(false)
    setExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new (jsPDF as unknown as new (opts: Record<string, string>) => InstanceType<typeof jsPDF>)({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const fromLabel = format(fromDate, 'MMMM yyyy', { locale: es }).toUpperCase()
      const toLabel = format(toDate, 'MMMM yyyy', { locale: es }).toUpperCase()
      const rangeLabel = fromDate.getTime() === toDate.getTime()
        ? fromLabel
        : `${fromLabel} — ${toLabel}`

      // Obtener todos los meses en el rango
      const months = eachMonthOfInterval({ start: fromDate, end: toDate })

      let isFirstPage = true

      for (const monthDate of months) {
        const year = monthDate.getFullYear()
        const month = monthDate.getMonth()
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
        const monthName = format(monthDate, 'MMMM yyyy', { locale: es }).toUpperCase()

        if (!isFirstPage) {
          doc.addPage()
        }
        isFirstPage = false

        // ── Cabecera de página ────────────────────────────────────────────
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 30, 30)
        doc.text(`CALENDARIO UNIFICADO — ${monthName}`, 148, 14, { align: 'center' })
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text(`Juzgado de Tarazona · Rango: ${rangeLabel} · ${filterLabel ?? 'Todos los trabajadores'}`, 148, 20, { align: 'center' })

        // Línea separadora
        doc.setDrawColor(220, 220, 230)
        doc.line(10, 23, 287, 23)

        // ── 1. GUARDIAS del mes ──────────────────────────────────────────
        const monthGuards = guards.filter((g) => {
          const startMonth = g.start_date?.slice(0, 7)
          const endMonth = g.end_date?.slice(0, 7)
          return startMonth === monthStr || endMonth === monthStr
        })

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 30, 30)
        doc.text('GUARDIAS', 10, 30)

        autoTable(doc, {
          startY: 33,
          head: [['Semana', 'Inicio', 'Fin', 'Gestor/a', 'Tramitador/a', 'Auxilio']],
          body: monthGuards.length > 0
            ? monthGuards.map((g) => [
                `Sem. ${g.week_number ?? '?'}`,
                formatDate(g.start_date),
                formatDate(g.end_date),
                g.gestor ? `${g.gestor.first_name} ${g.gestor.last_name}` : '—',
                g.tramitador ? `${g.tramitador.first_name} ${g.tramitador.last_name}` : '—',
                g.auxilio ? `${g.auxilio.first_name} ${g.auxilio.last_name}` : '—',
              ])
            : [['—', '—', '—', '—', '—', 'Sin guardias en este mes']],
          headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 24 },
            2: { cellWidth: 24 },
            3: { cellWidth: 55 },
            4: { cellWidth: 55 },
            5: { cellWidth: 55 },
          },
          margin: { left: 10, right: 10 },
        })

        // ── 2. VACACIONES Y ASUNTOS PROPIOS ──────────────────────────────
        const monthStart = new Date(year, month, 1)
        const monthEnd = new Date(year, month, getDaysInMonth(monthDate))

        const monthVacations = vacations.filter((v) => {
          if (!v.start_date || !v.end_date) return false
          const vStart = new Date(v.start_date + 'T00:00:00')
          const vEnd = new Date(v.end_date + 'T00:00:00')
          return vStart <= monthEnd && vEnd >= monthStart
        })

        const lastGuardY = ((doc as unknown as Record<string, { finalY?: number }>).lastAutoTable?.finalY ?? 50) + 7

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 30, 30)
        doc.text('VACACIONES Y ASUNTOS PROPIOS', 10, lastGuardY)

        autoTable(doc, {
          startY: lastGuardY + 3,
          head: [['Personal', 'Tipo', 'Inicio', 'Fin']],
          body: monthVacations.length > 0
            ? monthVacations.map((v) => [
                v.staff ? `${v.staff.first_name} ${v.staff.last_name}` : '—',
                tipoLabel(v.tipo),
                formatDate(v.start_date),
                formatDate(v.end_date),
              ])
            : [['—', '—', '—', 'Sin ausencias en este mes']],
          headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 40 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
          },
          margin: { left: 10, right: 10 },
        })

        // ── 3. FESTIVOS ──────────────────────────────────────────────────
        const monthHolidays = holidays.filter((h) => h.date?.slice(0, 7) === monthStr)

        if (monthHolidays.length > 0) {
          const lastVacY = ((doc as unknown as Record<string, { finalY?: number }>).lastAutoTable?.finalY ?? 100) + 7
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(30, 30, 30)
          doc.text('FESTIVOS', 10, lastVacY)

          autoTable(doc, {
            startY: lastVacY + 3,
            head: [['Fecha', 'Festivo', 'Ámbito']],
            body: monthHolidays.map((h) => [
              h.date ? format(new Date(h.date + 'T00:00:00'), 'dd/MM/yyyy') : '—',
              h.name || '—',
              h.scope ? h.scope.charAt(0).toUpperCase() + h.scope.slice(1) : '—',
            ]),
            headStyles: { fillColor: [202, 138, 4], textColor: 255, fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [255, 251, 235] },
            margin: { left: 10, right: 10 },
          })
        }

        // ── Pie de página ────────────────────────────────────────────────
        const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(160, 160, 160)
        doc.text(
          `Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })} · Juzgado de Tarazona · Pág. ${pageCount}`,
          148,
          200,
          { align: 'center' },
        )
      }

      const fromStr = format(fromDate, 'yyyy-MM')
      const toStr = format(toDate, 'yyyy-MM')
      const filename = fromStr === toStr
        ? `calendario_${fromStr}.pdf`
        : `calendario_${fromStr}_${toStr}.pdf`

      const pdfOutput = doc.output('arraybuffer')
      const blob = new Blob([pdfOutput], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS) {
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 100)
      }
    } catch (err) {
      console.error('Error exportando PDF:', err)
      alert('Error al generar el PDF. Inténtalo de nuevo.')
    } finally {
      setExporting(false)
    }
  }

  const totalMonths = eachMonthOfInterval({ start: fromDate, end: toDate }).length
  const fromLabel = format(fromDate, 'MMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase())
  const toLabel = format(toDate, 'MMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase())
  const rangeText = fromDate.getTime() === toDate.getTime()
    ? fromLabel
    : `${fromLabel} → ${toLabel}`

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

      <PopoverContent className="w-[min(520px,calc(100vw-2rem))] p-4 md:p-5 rounded-[20px] shadow-2xl border-slate-200" align="end">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-indigo-500" />
          <p className="text-[13px] font-bold text-slate-800">Selecciona el rango de fechas</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 mb-5">
          <div className="bg-slate-50 rounded-xl p-3">
            <MonthPicker label="Desde" value={fromDate} onChange={handleFromChange} />
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <MonthPicker label="Hasta" value={toDate} onChange={handleToChange} />
          </div>
        </div>

        <div className="bg-indigo-50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5">Resumen</p>
            <p className="text-[13px] font-semibold text-indigo-800">{rangeText}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5">Páginas</p>
            <p className="text-[13px] font-semibold text-indigo-800">{totalMonths} {totalMonths === 1 ? 'página' : 'páginas'}</p>
          </div>
        </div>

        <DSButton className="w-full h-10 text-[14px] font-semibold gap-2" onClick={handleExport} disabled={exporting}>
          {exporting
            ? <><Loader2 className="h-4 w-4 animate-spin" />Generando PDF…</>
            : <><FileDown className="h-4 w-4" />Exportar {rangeText}{filterLabel ? ` · ${filterLabel}` : ' · Todos'}</>
          }
        </DSButton>
      </PopoverContent>
    </Popover>
  )
}
