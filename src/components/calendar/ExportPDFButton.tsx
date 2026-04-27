"use client"

import { useState } from "react"
import { DSButton } from "@/lib/design-system"
import { FileDown, Loader2, ChevronLeft, ChevronRight, Calendar, Filter, Layers } from "lucide-react"
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
  week_number?: number
  start_date: string
  end_date: string
  auxilio:    { id: string; first_name: string; last_name?: string } | null
  tramitador: { id: string; first_name: string; last_name?: string } | null
  gestor:     { id: string; first_name: string; last_name?: string } | null
}

interface PDFVacation {
  id: string
  staff_id: string
  start_date: string
  end_date: string
  tipo?: string | null
  staff?: { id?: string; first_name: string; last_name?: string } | null
}

interface PDFHoliday {
  id: string
  date: string
  name: string
  scope: string
}

interface ExportPDFButtonProps {
  guards:      PDFGuard[]
  vacations:   PDFVacation[]
  holidays:    PDFHoliday[]
  staff:       PDFStaffMember[]
  filterLabel?: string
}

// ─── Month Picker ─────────────────────────────────────────────────────────────
function MonthPicker({ label, value, onChange }: {
  label: string; value: Date; onChange: (d: Date) => void
}) {
  const monthLabel = format(value, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase())
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{label}</p>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => onChange(subMonths(value, 1))}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronLeft className="h-3.5 w-3.5 text-slate-600" />
        </button>
        <span className="text-[13px] font-semibold text-slate-800 capitalize">{monthLabel}</span>
        <button type="button" onClick={() => onChange(addMonths(value, 1))}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: 12 }, (_, i) => {
          const d = new Date(value.getFullYear(), i, 1)
          const isSelected = d.getMonth() === value.getMonth() && d.getFullYear() === value.getFullYear()
          return (
            <button key={i} type="button" onClick={() => onChange(d)}
              className={`h-7 rounded-lg text-[11px] font-semibold transition-colors capitalize ${
                isSelected ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>
              {format(d, 'MMM', { locale: es })}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-2 bg-slate-50 rounded-lg px-2 py-1">
        <button type="button" onClick={() => onChange(new Date(value.getFullYear() - 1, value.getMonth(), 1))}
          className="text-[11px] text-slate-500 hover:text-slate-800 font-bold transition-colors">
          ‹ {value.getFullYear() - 1}
        </button>
        <span className="text-[12px] font-bold text-slate-800">{value.getFullYear()}</span>
        <button type="button" onClick={() => onChange(new Date(value.getFullYear() + 1, value.getMonth(), 1))}
          className="text-[11px] text-slate-500 hover:text-slate-800 font-bold transition-colors">
          {value.getFullYear() + 1} ›
        </button>
      </div>
    </div>
  )
}

// ─── Color constants ──────────────────────────────────────────────────────────
const C = {
  indigo:      [79,  70,  229] as [number,number,number],
  indigoLight: [238,242,255]   as [number,number,number],
  violet:      [124, 58, 237]  as [number,number,number],
  emerald:     [5,  150, 105]  as [number,number,number],
  emeraldLight:[236,253,245]   as [number,number,number],
  amber:       [217,119,  6]   as [number,number,number],
  amberLight:  [255,251,235]   as [number,number,number],
  slate50:     [248,250,252]   as [number,number,number],
  slate100:    [241,245,249]   as [number,number,number],
  slate200:    [226,232,240]   as [number,number,number],
  slate400:    [148,163,184]   as [number,number,number],
  slate700:    [51, 65,  85]   as [number,number,number],
  slate900:    [15, 23,  42]   as [number,number,number],
  white:       [255,255,255]   as [number,number,number],
  weekendBg:   [245,243,255]   as [number,number,number],
}

export function ExportPDFButton({ guards, vacations, holidays, filterLabel }: ExportPDFButtonProps) {
  const [exporting,    setExporting]    = useState(false)
  const [popoverOpen,  setPopoverOpen]  = useState(false)
  const [fromDate,     setFromDate]     = useState<Date>(() => new Date(new Date().getFullYear(), 0, 1))
  const [toDate,       setToDate]       = useState<Date>(() => new Date(new Date().getFullYear(), 11, 1))

  const handleFromChange = (d: Date) => { setFromDate(d); if (d > toDate) setToDate(d) }
  const handleToChange   = (d: Date) => { setToDate(d);   if (d < fromDate) setFromDate(d) }

  const formatDate = (d: string) => d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy') : '—'
  const tipoLabel  = (tipo?: string | null) => tipo === 'asuntos_propios' ? 'Asuntos propios' : 'Vacaciones'

  const handleExport = async () => {
    setPopoverOpen(false)
    setExporting(true)
    try {
      const { jsPDF }  = await import('jspdf')
      const autoTable  = (await import('jspdf-autotable')).default
      type DocType = InstanceType<typeof jsPDF>

      const doc = new (jsPDF as unknown as new (opts: Record<string, string>) => DocType)({
        orientation: 'landscape', unit: 'mm', format: 'a4',
      })

      const generatedAt  = format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })
      const personLabel  = filterLabel ?? 'Todos los trabajadores'
      const fromLabel    = format(fromDate, 'MMMM yyyy', { locale: es }).toUpperCase()
      const toLabel      = format(toDate,   'MMMM yyyy', { locale: es }).toUpperCase()
      const rangeLabel   = fromDate.getTime() === toDate.getTime() ? fromLabel : `${fromLabel} — ${toLabel}`
      const months       = eachMonthOfInterval({ start: fromDate, end: toDate })

      const DAY_NAMES = ['VIE', 'SÁB', 'DOM', 'LUN', 'MAR', 'MIÉ', 'JUE']
      const DAY_JS    = [5, 6, 0, 1, 2, 3, 4]

      // ── Shared page header ──────────────────────────────────────────────────
      const drawPageHeader = (d: DocType, monthName: string, tag: 'DATOS' | 'CALENDARIO') => {
        // Top accent bar
        d.setFillColor(...C.indigo)
        d.rect(0, 0, 297, 5, 'F')
        // Violet gradient continuation (approximate with second rect)
        d.setFillColor(...C.violet)
        d.rect(200, 0, 97, 5, 'F')

        // Institution
        d.setFontSize(7)
        d.setFont('helvetica', 'normal')
        d.setTextColor(...C.white)
        d.text('JUZGADO DE PRIMERA INSTANCIA E INSTRUCCIÓN · TARAZONA', 10, 3.5)

        // Month name
        d.setFontSize(16)
        d.setFont('helvetica', 'bold')
        d.setTextColor(...C.slate900)
        d.text(monthName, 10, 14)

        // Tag pill
        const tagBg = tag === 'DATOS' ? C.indigoLight : C.weekendBg
        const tagTx = tag === 'DATOS' ? C.indigo : C.violet
        d.setFillColor(...tagBg)
        d.roundedRect(10, 16.5, tag === 'DATOS' ? 20 : 30, 5, 1, 1, 'F')
        d.setFontSize(6)
        d.setFont('helvetica', 'bold')
        d.setTextColor(...tagTx)
        d.text(tag, 13, 20.4)

        // Filter & range info
        d.setFontSize(8)
        d.setFont('helvetica', 'normal')
        d.setTextColor(...C.slate400)
        d.text(`${rangeLabel}`, 297 - 10, 10, { align: 'right' })
        d.setFontSize(7)
        if (filterLabel) {
          d.setFillColor(...C.indigoLight)
          const lw = d.getTextWidth(`👤 ${personLabel}`) + 8
          d.roundedRect(297 - 10 - lw, 12, lw, 5.5, 1, 1, 'F')
          d.setTextColor(...C.indigo)
          d.text(`⬤ ${personLabel}`, 297 - 10, 16, { align: 'right' })
        } else {
          d.setTextColor(...C.slate400)
          d.text(personLabel, 297 - 10, 16, { align: 'right' })
        }

        // Separator line
        d.setDrawColor(...C.slate200)
        d.setLineWidth(0.3)
        d.line(10, 24, 287, 24)
      }

      // ── Footer ──────────────────────────────────────────────────────────────
      const drawFooter = (d: DocType, pageNum: number, totalPages: number) => {
        d.setDrawColor(...C.slate200)
        d.setLineWidth(0.2)
        d.line(10, 204, 287, 204)
        d.setFontSize(7)
        d.setFont('helvetica', 'normal')
        d.setTextColor(...C.slate400)
        d.text(`Generado el ${generatedAt}`, 10, 208)
        d.text(`Juzgado de Tarazona · Sistema de Guardias Judiciales`, 148, 208, { align: 'center' })
        d.text(`Pág. ${pageNum} / ${totalPages}`, 287, 208, { align: 'right' })
      }

      const totalPages = months.length * 2
      let pageNum = 0

      for (const monthDate of months) {
        const year     = monthDate.getFullYear()
        const month    = monthDate.getMonth()
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
        const monthName = format(monthDate, 'MMMM yyyy', { locale: es }).toUpperCase()

        // ══════════════════════════════════════════════════════════════════════
        // PAGE A: TABLES (guards · vacations · holidays)
        // ══════════════════════════════════════════════════════════════════════
        if (pageNum > 0) doc.addPage()
        pageNum++
        drawPageHeader(doc, monthName, 'DATOS')

        const monthGuards = guards.filter(g => {
          const sm = g.start_date?.slice(0, 7)
          const em = g.end_date?.slice(0, 7)
          return sm === monthStr || em === monthStr
        })

        const monthStart    = new Date(year, month, 1)
        const monthEnd      = new Date(year, month, getDaysInMonth(monthDate))
        const monthVacations = vacations.filter(v => {
          if (!v.start_date || !v.end_date) return false
          const vs = new Date(v.start_date + 'T00:00:00')
          const ve = new Date(v.end_date   + 'T00:00:00')
          return vs <= monthEnd && ve >= monthStart
        })
        const monthHolidays = holidays.filter(h => h.date?.slice(0, 7) === monthStr)

        // ── Guards section ──────────────────────────────────────────────────
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...C.indigo)
        doc.text('▌  GUARDIAS', 10, 31)

        autoTable(doc, {
          startY: 33.5,
          head: [['Semana', 'Inicio', 'Fin', 'Gestor/a', 'Tramitador/a', 'Auxilio Judicial']],
          body: monthGuards.length > 0
            ? monthGuards.map(g => [
                `Sem. ${g.week_number ?? '?'}`,
                formatDate(g.start_date),
                formatDate(g.end_date),
                g.gestor     ? `${g.gestor.first_name} ${g.gestor.last_name ?? ''}`     : '—',
                g.tramitador ? `${g.tramitador.first_name} ${g.tramitador.last_name ?? ''}` : '—',
                g.auxilio    ? `${g.auxilio.first_name} ${g.auxilio.last_name ?? ''}`    : '—',
              ])
            : [['—', '—', '—', '—', '—', 'Sin guardias asignadas este mes']],
          headStyles:  { fillColor: C.indigo,      textColor: C.white, fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
          bodyStyles:  { fontSize: 8, textColor: C.slate700, cellPadding: 2.5 },
          alternateRowStyles: { fillColor: C.indigoLight },
          columnStyles: { 0:{cellWidth:18}, 1:{cellWidth:24}, 2:{cellWidth:24}, 3:{cellWidth:60}, 4:{cellWidth:60}, 5:{cellWidth:60} },
          margin: { left: 10, right: 10 },
          tableLineColor: C.slate200,
          tableLineWidth: 0.1,
        })

        // ── Vacations section ───────────────────────────────────────────────
        const afterGuardsY = ((doc as unknown as Record<string, {finalY?: number}>).lastAutoTable?.finalY ?? 50) + 8
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...C.emerald)
        doc.text('▌  VACACIONES Y ASUNTOS PROPIOS', 10, afterGuardsY)

        autoTable(doc, {
          startY: afterGuardsY + 2.5,
          head: [['Personal', 'Tipo', 'Inicio', 'Fin', 'Días']],
          body: monthVacations.length > 0
            ? monthVacations.map(v => {
                const vs = new Date((v.start_date) + 'T00:00:00')
                const ve = new Date((v.end_date)   + 'T00:00:00')
                const days = Math.round((ve.getTime() - vs.getTime()) / 86400000) + 1
                return [
                  v.staff ? `${v.staff.first_name} ${v.staff.last_name ?? ''}` : '—',
                  tipoLabel(v.tipo),
                  formatDate(v.start_date),
                  formatDate(v.end_date),
                  `${days}d`,
                ]
              })
            : [['—', '—', '—', '—', 'Sin ausencias registradas este mes']],
          headStyles:  { fillColor: C.emerald, textColor: C.white, fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
          bodyStyles:  { fontSize: 8, textColor: C.slate700, cellPadding: 2.5 },
          alternateRowStyles: { fillColor: C.emeraldLight },
          columnStyles: { 0:{cellWidth:90}, 1:{cellWidth:40}, 2:{cellWidth:28}, 3:{cellWidth:28}, 4:{cellWidth:14} },
          margin: { left: 10, right: 10 },
          tableLineColor: C.slate200,
          tableLineWidth: 0.1,
        })

        // ── Holidays section ────────────────────────────────────────────────
        if (monthHolidays.length > 0) {
          const afterVacY = ((doc as unknown as Record<string, {finalY?: number}>).lastAutoTable?.finalY ?? 100) + 8
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...C.amber)
          doc.text('▌  FESTIVOS', 10, afterVacY)
          autoTable(doc, {
            startY: afterVacY + 2.5,
            head: [['Fecha', 'Denominación', 'Ámbito']],
            body: monthHolidays.map(h => [
              h.date ? format(new Date(h.date + 'T00:00:00'), "dd 'de' MMMM", { locale: es }) : '—',
              h.name || '—',
              h.scope === 'nacional'           ? 'Nacional'
                : h.scope === 'aragon'         ? 'Comunidad de Aragón'
                : h.scope === 'zaragoza_provincia' ? 'Provincia de Zaragoza'
                : h.scope === 'tarazona'       ? 'Tarazona'
                : h.scope.charAt(0).toUpperCase() + h.scope.slice(1),
            ]),
            headStyles:  { fillColor: C.amber, textColor: C.white, fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
            bodyStyles:  { fontSize: 8, textColor: C.slate700, cellPadding: 2.5 },
            alternateRowStyles: { fillColor: C.amberLight },
            columnStyles: { 0:{cellWidth:38}, 1:{cellWidth:160}, 2:{cellWidth:42} },
            margin: { left: 10, right: 10 },
            tableLineColor: C.slate200,
            tableLineWidth: 0.1,
          })
        }

        drawFooter(doc, pageNum, totalPages)

        // ══════════════════════════════════════════════════════════════════════
        // PAGE B: VISUAL CALENDAR GRID
        // ══════════════════════════════════════════════════════════════════════
        doc.addPage()
        pageNum++
        drawPageHeader(doc, monthName, 'CALENDARIO')

        const CAL_LEFT  = 10
        const CAL_TOP   = 26
        const CAL_WIDTH = 277
        const COL_W     = CAL_WIDTH / 7
        const HDR_H     = 8

        const daysInMonth  = getDaysInMonth(monthDate)
        const firstDayJS   = new Date(year, month, 1).getDay()
        const firstCol     = DAY_JS.indexOf(firstDayJS)
        const numRows      = Math.ceil((firstCol + daysInMonth) / 7)
        const GRID_BOTTOM  = 200
        const ROW_H        = (GRID_BOTTOM - CAL_TOP - HDR_H) / numRows

        // ── Column headers ──────────────────────────────────────────────────
        for (let c = 0; c < 7; c++) {
          const x = CAL_LEFT + c * COL_W
          const weekend = c === 1 || c === 2
          doc.setFillColor(...(weekend ? [232, 228, 255] : C.indigo) as [number,number,number])
          doc.setDrawColor(...C.slate200)
          doc.setLineWidth(0.2)
          doc.rect(x, CAL_TOP, COL_W, HDR_H, 'FD')
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...(weekend ? C.violet : C.white) as [number,number,number])
          doc.text(DAY_NAMES[c], x + COL_W / 2, CAL_TOP + HDR_H - 2, { align: 'center' })
        }

        // ── Build per-day data ─────────────────────────────────────────────
        interface DayInfo {
          guard: PDFGuard | null
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
              if (isFirstVisible) { dayInfo[d].guardIsFirstVisible = true; isFirstVisible = false }
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

        // ── Empty leading cells ────────────────────────────────────────────
        for (let c = 0; c < firstCol; c++) {
          const x = CAL_LEFT + c * COL_W
          const y = CAL_TOP + HDR_H
          doc.setFillColor(...C.slate50)
          doc.setDrawColor(...C.slate200)
          doc.setLineWidth(0.2)
          doc.rect(x, y, COL_W, ROW_H, 'FD')
        }

        // ── Day cells ─────────────────────────────────────────────────────
        for (let d = 1; d <= daysInMonth; d++) {
          const cellIdx = firstCol + d - 1
          const row     = Math.floor(cellIdx / 7)
          const col     = cellIdx % 7
          const x       = CAL_LEFT + col * COL_W
          const y       = CAL_TOP + HDR_H + row * ROW_H
          const info    = dayInfo[d]
          const today   = new Date()
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d

          // Base background
          doc.setFillColor(...(info.weekend ? C.weekendBg : C.white) as [number,number,number])
          doc.setDrawColor(...C.slate200)
          doc.setLineWidth(0.2)
          doc.rect(x, y, COL_W, ROW_H, 'FD')

          // Holiday tint
          if (info.holidays.length > 0) {
            const h = info.holidays[0]
            const tint: [number,number,number] =
              h.scope === 'aragon'             ? [255, 247, 237] :
              h.scope === 'zaragoza_provincia' ? [239, 246, 255] :
              h.scope === 'tarazona'           ? [238, 234, 255] :
                                                 [255, 251, 235]
            doc.setFillColor(...tint)
            doc.rect(x + 0.3, y + 0.3, COL_W - 0.6, ROW_H - 0.6, 'F')
          }

          // Today highlight
          if (isToday) {
            doc.setDrawColor(...C.indigo)
            doc.setLineWidth(0.8)
            doc.rect(x + 0.4, y + 0.4, COL_W - 0.8, ROW_H - 0.8, 'S')
            doc.setLineWidth(0.2)
          }

          // Guard bar (indigo, top 5mm)
          if (info.guard) {
            doc.setFillColor(...C.indigo)
            doc.rect(x, y, COL_W, 5, 'F')
            if (info.guardIsFirstVisible) {
              const g     = info.guard
              const parts = [
                g.auxilio    ? `A: ${g.auxilio.first_name}`    : null,
                g.tramitador ? `T: ${g.tramitador.first_name}` : null,
                g.gestor     ? `G: ${g.gestor.first_name}`     : null,
              ].filter(Boolean).join('  ·  ')
              const remainCols = 7 - col
              doc.setFontSize(5.5)
              doc.setFont('helvetica', 'bold')
              doc.setTextColor(...C.white)
              doc.text(parts, x + 1.5, y + 3.4, { maxWidth: remainCols * COL_W - 3 })
            }
          }

          // Vacation bar (emerald)
          if (info.vacations.length > 0) {
            const barY = y + (info.guard ? 5.8 : 0.5)
            doc.setFillColor(...C.emerald)
            doc.rect(x + 0.3, barY, COL_W - 0.6, 3, 'F')
            const firstVac = info.vacations[0]
            const fvStart  = new Date(firstVac.start_date + 'T00:00:00')
            const isFirstVacDay = fvStart.getMonth() === month && fvStart.getDate() === d
            if ((isFirstVacDay || d === 1) && firstVac.staff) {
              doc.setFontSize(4.8)
              doc.setFont('helvetica', 'bold')
              doc.setTextColor(...C.white)
              doc.text(firstVac.staff.first_name, x + 1.5, barY + 2.2, { maxWidth: COL_W - 3 })
            }
          }

          // Day number
          doc.setFontSize(isToday ? 9.5 : 8.5)
          doc.setFont('helvetica', isToday ? 'bold' : 'bold')
          const numColor: [number,number,number] = isToday ? C.indigo : info.weekend ? C.violet : C.slate700
          doc.setTextColor(...numColor)
          doc.text(String(d), x + COL_W - 2.5, y + ROW_H - 2.5, { align: 'right' })

          // Holiday name
          if (info.holidays.length > 0) {
            const h = info.holidays[0]
            const tc: [number,number,number] =
              h.scope === 'aragon'             ? [154, 52, 18] :
              h.scope === 'zaragoza_provincia' ? [30,  58, 138] :
              h.scope === 'tarazona'           ? [76, 29, 149] :
                                                 [133, 77, 14]
            doc.setFontSize(5)
            doc.setFont('helvetica', 'italic')
            doc.setTextColor(...tc)
            doc.text(h.name, x + 1.5, y + ROW_H - 3.5, { maxWidth: COL_W - 9 })
          }
        }

        // ── Empty trailing cells ───────────────────────────────────────────
        const totalCells  = firstCol + daysInMonth
        const filledInLast = totalCells % 7
        if (filledInLast !== 0) {
          for (let c = filledInLast; c < 7; c++) {
            const x = CAL_LEFT + c * COL_W
            const y = CAL_TOP + HDR_H + (numRows - 1) * ROW_H
            doc.setFillColor(...C.slate50)
            doc.setDrawColor(...C.slate200)
            doc.rect(x, y, COL_W, ROW_H, 'FD')
          }
        }

        // ── Legend ─────────────────────────────────────────────────────────
        const legendY = CAL_TOP + HDR_H + numRows * ROW_H + 3.5
        const legendItems: [[number,number,number], string][] = [
          [C.indigo,   'Guardia de semana'],
          [C.emerald,  'Vacaciones / Asuntos propios'],
          [[253,230,138], 'Festivo nacional'],
          [[253,215,180], 'Festivo autonómico (Aragón)'],
          [[191,219,254], 'Festivo local (Tarazona)'],
        ]
        let lx = CAL_LEFT
        for (const [[r, g, b], label] of legendItems) {
          doc.setFillColor(r, g, b)
          doc.setDrawColor(...C.slate200)
          doc.setLineWidth(0.2)
          doc.roundedRect(lx, legendY, 4, 3, 0.5, 0.5, 'FD')
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...C.slate700)
          doc.text(label, lx + 5.5, legendY + 2.4)
          lx += doc.getTextWidth(label) + 12
        }

        drawFooter(doc, pageNum, totalPages)
      }

      const fromStr  = format(fromDate, 'yyyy-MM')
      const toStr    = format(toDate,   'yyyy-MM')
      const filename = fromStr === toStr
        ? `calendario_guardias_${fromStr}.pdf`
        : `calendario_guardias_${fromStr}_${toStr}.pdf`

      const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
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

  const months     = eachMonthOfInterval({ start: fromDate, end: toDate })
  const totalPages = months.length * 2
  const fromLabel  = format(fromDate, 'MMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase())
  const toLabel2   = format(toDate,   'MMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase())
  const rangeText  = fromDate.getTime() === toDate.getTime() ? fromLabel : `${fromLabel} → ${toLabel2}`

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

      <PopoverContent className="w-[min(540px,calc(100vw-2rem))] p-5 rounded-[20px] shadow-2xl border-slate-200" align="end">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-indigo-500" />
          <p className="text-[13px] font-bold text-slate-800">Configurar exportación PDF</p>
        </div>

        {/* Month pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 rounded-xl p-3">
            <MonthPicker label="Desde" value={fromDate} onChange={handleFromChange} />
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <MonthPicker label="Hasta" value={toDate} onChange={handleToChange} />
          </div>
        </div>

        {/* Active filter info */}
        {filterLabel && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
            <Filter className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <p className="text-[12px] text-indigo-700 font-medium">
              Filtro activo: <span className="font-bold">{filterLabel}</span> — el PDF incluirá solo sus datos
            </p>
          </div>
        )}
        {!filterLabel && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
            <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <p className="text-[12px] text-slate-500">El PDF incluirá datos de todo el personal</p>
          </div>
        )}

        {/* Summary */}
        <div className="bg-indigo-50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5">Rango</p>
            <p className="text-[13px] font-semibold text-indigo-800">{rangeText}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5">Páginas</p>
            <p className="text-[13px] font-semibold text-indigo-800">
              {totalPages} <span className="font-normal text-indigo-500">({months.length} mes{months.length !== 1 ? 'es' : ''} × 2)</span>
            </p>
          </div>
        </div>

        <DSButton className="w-full h-10 text-[14px] font-semibold gap-2" onClick={handleExport} disabled={exporting}>
          {exporting
            ? <><Loader2 className="h-4 w-4 animate-spin" />Generando PDF…</>
            : <><FileDown className="h-4 w-4" />Exportar {rangeText}{filterLabel ? ` · ${filterLabel}` : ' · Todo el personal'}</>}
        </DSButton>
      </PopoverContent>
    </Popover>
  )
}
