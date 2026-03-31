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

      type DocType = InstanceType<typeof jsPDF>
      const doc = new (jsPDF as unknown as new (opts: Record<string, string>) => DocType)({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const generatedAt = format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })
      const personLabel = filterLabel ?? 'Todos los trabajadores'

      const fromLabel = format(fromDate, 'MMMM yyyy', { locale: es }).toUpperCase()
      const toLabel   = format(toDate,   'MMMM yyyy', { locale: es }).toUpperCase()
      const rangeLabel = fromDate.getTime() === toDate.getTime() ? fromLabel : `${fromLabel} — ${toLabel}`

      const months = eachMonthOfInterval({ start: fromDate, end: toDate })

      // Week starts on Friday: col index 0=Fri,1=Sat,2=Sun,3=Mon,4=Tue,5=Wed,6=Thu
      const DAY_NAMES = ['VIE', 'SÁB', 'DOM', 'LUN', 'MAR', 'MIÉ', 'JUE']
      const DAY_JS    = [5, 6, 0, 1, 2, 3, 4] // JS getDay() values for each column

      const drawFooter = (d: DocType, pageNum: number) => {
        d.setFontSize(7)
        d.setFont('helvetica', 'italic')
        d.setTextColor(160, 160, 160)
        d.text(
          `Generado el ${generatedAt} · Juzgado de Tarazona · Pág. ${pageNum}`,
          148, 207, { align: 'center' },
        )
      }

      let pageNum = 0

      for (const monthDate of months) {
        const year     = monthDate.getFullYear()
        const month    = monthDate.getMonth()
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
        const monthName = format(monthDate, 'MMMM yyyy', { locale: es }).toUpperCase()

        // ════════════════════════════════════════════════════════════════
        // PAGE 1 OF MONTH: DATA TABLES
        // ════════════════════════════════════════════════════════════════
        if (pageNum > 0) doc.addPage()
        pageNum++

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 30, 30)
        doc.text(`CALENDARIO UNIFICADO — ${monthName}`, 148, 14, { align: 'center' })
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text(`Juzgado de Tarazona · Rango: ${rangeLabel} · ${personLabel}`, 148, 20, { align: 'center' })
        doc.setDrawColor(220, 220, 230)
        doc.line(10, 23, 287, 23)

        // Guards table
        const monthGuards = guards.filter(g => {
          const sm = g.start_date?.slice(0, 7)
          const em = g.end_date?.slice(0, 7)
          return sm === monthStr || em === monthStr
        })

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 30, 30)
        doc.text('GUARDIAS', 10, 30)

        autoTable(doc, {
          startY: 33,
          head: [['Semana', 'Inicio', 'Fin', 'Gestor/a', 'Tramitador/a', 'Auxilio']],
          body: monthGuards.length > 0
            ? monthGuards.map(g => [
                `Sem. ${g.week_number ?? '?'}`,
                formatDate(g.start_date),
                formatDate(g.end_date),
                g.gestor     ? `${g.gestor.first_name} ${g.gestor.last_name}`     : '—',
                g.tramitador ? `${g.tramitador.first_name} ${g.tramitador.last_name}` : '—',
                g.auxilio    ? `${g.auxilio.first_name} ${g.auxilio.last_name}`    : '—',
              ])
            : [['—', '—', '—', '—', '—', 'Sin guardias en este mes']],
          headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          columnStyles: { 0:{cellWidth:18}, 1:{cellWidth:24}, 2:{cellWidth:24}, 3:{cellWidth:55}, 4:{cellWidth:55}, 5:{cellWidth:55} },
          margin: { left: 10, right: 10 },
        })

        // Vacations table
        const monthStart = new Date(year, month, 1)
        const monthEnd   = new Date(year, month, getDaysInMonth(monthDate))
        const monthVacations = vacations.filter(v => {
          if (!v.start_date || !v.end_date) return false
          const vs = new Date(v.start_date + 'T00:00:00')
          const ve = new Date(v.end_date   + 'T00:00:00')
          return vs <= monthEnd && ve >= monthStart
        })

        const afterGuardsY = ((doc as unknown as Record<string, {finalY?: number}>).lastAutoTable?.finalY ?? 50) + 7
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 30, 30)
        doc.text('VACACIONES Y ASUNTOS PROPIOS', 10, afterGuardsY)

        autoTable(doc, {
          startY: afterGuardsY + 3,
          head: [['Personal', 'Tipo', 'Inicio', 'Fin']],
          body: monthVacations.length > 0
            ? monthVacations.map(v => [
                v.staff ? `${v.staff.first_name} ${v.staff.last_name}` : '—',
                tipoLabel(v.tipo),
                formatDate(v.start_date),
                formatDate(v.end_date),
              ])
            : [['—', '—', '—', 'Sin ausencias en este mes']],
          headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          columnStyles: { 0:{cellWidth:80}, 1:{cellWidth:40}, 2:{cellWidth:30}, 3:{cellWidth:30} },
          margin: { left: 10, right: 10 },
        })

        // Holidays table
        const monthHolidays = holidays.filter(h => h.date?.slice(0, 7) === monthStr)
        if (monthHolidays.length > 0) {
          const afterVacY = ((doc as unknown as Record<string, {finalY?: number}>).lastAutoTable?.finalY ?? 100) + 7
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(30, 30, 30)
          doc.text('FESTIVOS', 10, afterVacY)
          autoTable(doc, {
            startY: afterVacY + 3,
            head: [['Fecha', 'Festivo', 'Ámbito']],
            body: monthHolidays.map(h => [
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

        drawFooter(doc, pageNum)

        // ════════════════════════════════════════════════════════════════
        // PAGE 2 OF MONTH: VISUAL CALENDAR GRID
        // ════════════════════════════════════════════════════════════════
        doc.addPage()
        pageNum++

        // Header
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(20, 20, 40)
        doc.text(monthName, 148, 13, { align: 'center' })
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(120, 120, 140)
        doc.text(`${personLabel} · Juzgado de Tarazona`, 148, 19, { align: 'center' })
        doc.setDrawColor(200, 200, 220)
        doc.line(10, 21, 287, 21)

        const CAL_LEFT   = 10
        const CAL_TOP    = 23
        const CAL_WIDTH  = 277
        const COL_W      = CAL_WIDTH / 7
        const HDR_H      = 7

        const daysInMonth   = getDaysInMonth(monthDate)
        const firstDayJS    = new Date(year, month, 1).getDay()
        const firstCol      = DAY_JS.indexOf(firstDayJS)
        const numRows       = Math.ceil((firstCol + daysInMonth) / 7)
        // Page is 210mm tall. Reserve 14mm at bottom for legend (5mm) + footer (5mm) + margin.
        const GRID_BOTTOM   = 196
        const ROW_H         = (GRID_BOTTOM - CAL_TOP - HDR_H) / numRows

        // Column header row
        for (let c = 0; c < 7; c++) {
          const x = CAL_LEFT + c * COL_W
          const weekend = c === 1 || c === 2
          doc.setFillColor(...(weekend ? [232,232,242] : [220,228,255]) as [number,number,number])
          doc.setDrawColor(190, 195, 215)
          doc.rect(x, CAL_TOP, COL_W, HDR_H, 'FD')
          doc.setFontSize(7.5)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(weekend ? 130 : 50, weekend ? 130 : 60, weekend ? 160 : 160)
          doc.text(DAY_NAMES[c], x + COL_W / 2, CAL_TOP + HDR_H - 1.8, { align: 'center' })
        }

        // Build per-day data
        interface DayInfo {
          guard:     PDFGuard | null
          guardIsFirstVisible: boolean
          vacations: PDFVacation[]
          holidays:  PDFHoliday[]
          weekend:   boolean
        }
        const dayInfo: Record<number, DayInfo> = {}
        for (let d = 1; d <= daysInMonth; d++) {
          const col = DAY_JS.indexOf(new Date(year, month, d).getDay())
          dayInfo[d] = { guard: null, guardIsFirstVisible: false, vacations: [], holidays: [], weekend: col === 1 || col === 2 }
        }

        for (const g of monthGuards) {
          const gStart = new Date(g.start_date + 'T00:00:00')
          const gEnd   = new Date(g.end_date   + 'T00:00:00')
          let isFirstVisible = true
          for (let d = 1; d <= daysInMonth; d++) {
            const day = new Date(year, month, d)
            if (day >= gStart && day <= gEnd) {
              dayInfo[d].guard = g
              if (isFirstVisible) {
                dayInfo[d].guardIsFirstVisible = true
                isFirstVisible = false
              }
            }
          }
        }

        for (const v of monthVacations) {
          const vStart = new Date(v.start_date + 'T00:00:00')
          const vEnd   = new Date(v.end_date   + 'T00:00:00')
          for (let d = 1; d <= daysInMonth; d++) {
            const day = new Date(year, month, d)
            if (day >= vStart && day <= vEnd) dayInfo[d].vacations.push(v)
          }
        }

        for (const h of monthHolidays) {
          const hd = parseInt(h.date.slice(8, 10), 10)
          if (hd >= 1 && hd <= daysInMonth) dayInfo[hd].holidays.push(h)
        }

        // Draw empty leading cells
        for (let c = 0; c < firstCol; c++) {
          const x = CAL_LEFT + c * COL_W
          const y = CAL_TOP + HDR_H
          doc.setFillColor(242, 242, 248)
          doc.setDrawColor(205, 210, 225)
          doc.rect(x, y, COL_W, ROW_H, 'FD')
        }

        // Draw day cells
        for (let d = 1; d <= daysInMonth; d++) {
          const cellIdx = firstCol + d - 1
          const row     = Math.floor(cellIdx / 7)
          const col     = cellIdx % 7
          const x       = CAL_LEFT + col * COL_W
          const y       = CAL_TOP + HDR_H + row * ROW_H
          const info    = dayInfo[d]

          // Base background
          const bg: [number,number,number] = info.weekend ? [246,245,252] : [255,255,255]
          doc.setFillColor(...bg)
          doc.setDrawColor(205, 210, 225)
          doc.rect(x, y, COL_W, ROW_H, 'FD')

          // Holiday tint (full cell)
          if (info.holidays.length > 0) {
            const h = info.holidays[0]
            const tint: [number,number,number] =
              h.scope === 'aragon'            ? [255, 247, 235] :
              h.scope === 'zaragoza_provincia'? [235, 244, 255] :
              h.scope === 'tarazona'          ? [238, 234, 255] :
                                               [255, 251, 225]
            doc.setFillColor(...tint)
            doc.rect(x + 0.4, y + 0.4, COL_W - 0.8, ROW_H - 0.8, 'F')
          }

          // Guard bar — 4.5mm tall across the top
          if (info.guard) {
            doc.setFillColor(220, 38, 38)
            doc.rect(x, y, COL_W, 4.5, 'F')
            // Label on first visible cell of this guard this month
            if (info.guardIsFirstVisible) {
              const g    = info.guard
              const remainCols = 7 - col  // guard always Fri→Thu so = 7 when starts Fri
              const parts = [
                g.auxilio    ? `A: ${g.auxilio.first_name}`    : null,
                g.tramitador ? `T: ${g.tramitador.first_name}` : null,
                g.gestor     ? `G: ${g.gestor.first_name}`     : null,
              ].filter(Boolean).join('   ')
              doc.setFontSize(5.2)
              doc.setFont('helvetica', 'bold')
              doc.setTextColor(255, 255, 255)
              doc.text(parts, x + 1.5, y + 3.1, { maxWidth: remainCols * COL_W - 3 })
            }
          }

          // Vacation bar — 3mm tall below guard bar (or at top if no guard)
          if (info.vacations.length > 0) {
            const barY = y + (info.guard ? 5.2 : 0.5)
            doc.setFillColor(34, 197, 94)
            doc.rect(x + 0.4, barY, COL_W - 0.8, 3, 'F')

            // Name on first day of each vacation
            const firstVac = info.vacations[0]
            const fvStart  = new Date(firstVac.start_date + 'T00:00:00')
            const isFirstVacDay = fvStart.getMonth() === month && fvStart.getDate() === d
            if ((isFirstVacDay || d === 1) && firstVac.staff) {
              doc.setFontSize(4.8)
              doc.setFont('helvetica', 'bold')
              doc.setTextColor(255, 255, 255)
              doc.text(firstVac.staff.first_name, x + 1.5, barY + 2.2, { maxWidth: COL_W - 3 })
            }
          }

          // Day number — bottom right
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(info.weekend ? 150 : 35, info.weekend ? 140 : 40, info.weekend ? 175 : 70)
          doc.text(String(d), x + COL_W - 2, y + ROW_H - 2, { align: 'right' })

          // Holiday name — bottom left, small italic
          if (info.holidays.length > 0) {
            const h = info.holidays[0]
            const tc: [number,number,number] =
              h.scope === 'aragon'            ? [154, 52, 18]  :
              h.scope === 'zaragoza_provincia'? [30, 58, 138]  :
              h.scope === 'tarazona'          ? [49, 46, 129]  :
                                               [133, 77, 14]
            doc.setFontSize(5)
            doc.setFont('helvetica', 'italic')
            doc.setTextColor(...tc)
            doc.text(h.name, x + 1.5, y + ROW_H - 2.5, { maxWidth: COL_W - 10 })
          }
        }

        // Draw empty trailing cells to complete last row
        const totalCells   = firstCol + daysInMonth
        const filledInLast = totalCells % 7
        if (filledInLast !== 0) {
          for (let c = filledInLast; c < 7; c++) {
            const x = CAL_LEFT + c * COL_W
            const y = CAL_TOP + HDR_H + (numRows - 1) * ROW_H
            doc.setFillColor(242, 242, 248)
            doc.setDrawColor(205, 210, 225)
            doc.rect(x, y, COL_W, ROW_H, 'FD')
          }
        }

        // Legend
        const legendY = CAL_TOP + HDR_H + numRows * ROW_H + 3
        const items: [number,number,number,string][] = [
          [220, 38,  38,  'Guardia'],
          [34,  197, 94,  'Vacaciones'],
          [253, 230, 138, 'Festivo nacional'],
          [253, 215, 180, 'Festivo regional'],
          [191, 219, 254, 'Festivo local'],
        ]
        let lx = CAL_LEFT
        for (const [r, g, b, label] of items) {
          doc.setFillColor(r, g, b)
          doc.setDrawColor(180, 180, 180)
          doc.rect(lx, legendY, 4.5, 3, 'FD')
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(60, 60, 60)
          doc.text(label, lx + 5.5, legendY + 2.4)
          lx += doc.getTextWidth(label) + 12
        }

        drawFooter(doc, pageNum)
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
