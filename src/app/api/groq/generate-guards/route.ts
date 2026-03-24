/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: eslint-disable kept for Supabase nested relation casts (positions.guard_role, staff.positions)
// These are inherent to Supabase's JS client typing limitations with deep joins.
import { NextRequest, NextResponse } from 'next/server'
import { requireHeadmaster } from '@/lib/auth/require-role'
import { validateBody } from '@/lib/validators/api'
import { groqGenerateGuardsSchema } from '@/lib/validators/schemas'
import { callGroq } from '@/lib/groq/client'
import { buildSystemPrompt, buildUserPrompt, PromptData } from '@/lib/groq/prompts'
import { validateProposal, ProposalAssignment } from '@/lib/groq/validator'
import { buildFullName } from '@/lib/staff/normalize'
import { generateGuardPeriods } from '@/lib/guards/period-generator'
import { getSetting } from '@/lib/settings'
import { parseISO } from 'date-fns'

export const maxDuration = 120

/**
 * Extrae guard_role de la relación positions de Supabase.
 * Supabase puede devolver un objeto {guard_role: "auxilio"} o un array [{guard_role: "auxilio"}].
 */
function extractGuardRole(positions: unknown): string | null {
  if (!positions) return null
  if (Array.isArray(positions)) {
    return positions[0]?.guard_role ?? null
  }
  return (positions as { guard_role?: string }).guard_role ?? null
}

export async function POST(request: NextRequest) {
  const auth = await requireHeadmaster()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, groqGenerateGuardsSchema)
  if (!validation.success) return validation.response

  const { year, respectExisting, startDate, endDate } = validation.data

  try {
    // 1. Obtener Modelo desde app_settings (key/value table)
    const model = await getSetting(auth.supabase, 'groq_model', 'llama-3.3-70b-versatile')

    // 2. Traer Personal Activo
    const { data: staffData, error: staffError } = await auth.supabase
      .from('staff')
      .select('id, first_name, last_name, positions!inner(guard_role)')
      .eq('is_active', true)
      .eq('is_guard_eligible', true)
      .not('positions.guard_role', 'is', null)

    if (staffError) throw new Error("Error obteniendo personal activo")

    const promptStaff = (staffData || [])
      .map(s => ({
        id: s.id,
        name: buildFullName(s),
        category: extractGuardRole(s.positions)
      }))
      .filter(s => s.category !== null) as { id: string; name: string; category: string }[]

    // Verificar mínimo de staff por categoría antes de gastar tokens en Groq
    const auxCount = promptStaff.filter(s => s.category === 'auxilio').length
    const traCount = promptStaff.filter(s => s.category === 'tramitador').length
    const gesCount = promptStaff.filter(s => s.category === 'gestor').length

    if (auxCount === 0 || traCount === 0 || gesCount === 0) {
      return NextResponse.json({
        error: `Faltan personas en alguna categoría: ${auxCount} auxilios, ${traCount} tramitadores, ${gesCount} gestores. ` +
          `Cada categoría necesita al menos 1 persona activa y elegible para guardias.`
      }, { status: 400 })
    }

    // 3. Traer Periodos de la BD
    let periodsQuery = auth.supabase
      .from('guard_periods')
      .select('id, week_number, start_date, end_date')
      .eq('year', year)
      .order('week_number', { ascending: true })

    // Filtrar por rango de fechas si se proporcionan
    if (startDate) periodsQuery = periodsQuery.gte('start_date', startDate)
    if (endDate) periodsQuery = periodsQuery.lte('end_date', endDate)

    let { data: periodsData, error: periodsError } = await periodsQuery

    // Si no hay periodos, los generamos automáticamente
    if (periodsError || !periodsData || periodsData.length === 0) {
      const newPeriods = generateGuardPeriods(year)
      const { data: inserted, error: insertError } = await auth.supabase
        .from('guard_periods')
        .insert(newPeriods)
        .select()
      if (insertError) throw new Error(`Error auto-generando periodos: ${insertError.message}`)

      // Re-query with date filters applied
      let reQuery = auth.supabase
        .from('guard_periods')
        .select('id, week_number, start_date, end_date')
        .eq('year', year)
        .order('week_number', { ascending: true })
      if (startDate) reQuery = reQuery.gte('start_date', startDate)
      if (endDate) reQuery = reQuery.lte('end_date', endDate)

      const { data: reData, error: reError } = await reQuery
      if (reError || !reData || reData.length === 0) {
        return NextResponse.json({ error: `No hay periodos en el rango seleccionado para ${year}.` }, { status: 400 })
      }
      periodsData = reData
    }

    // 4. Traer Vacaciones Aprobadas
    const yearStart = periodsData[0].start_date
    const yearEnd = periodsData[periodsData.length - 1].end_date

    const { data: vacationsData, error: vacError } = await auth.supabase
      .from('vacations')
      .select('staff_id, start_date, end_date, staff(first_name, last_name)')
      .eq('status', 'approved')
      .lte('start_date', yearEnd)
      .gte('end_date', yearStart)

    if (vacError) throw new Error("Error obteniendo vacaciones")

    const promptVacations = (vacationsData || [])
      .filter(v => v.staff) // Ignorar vacaciones huérfanas (staff eliminado)
      .map(v => ({
        staff_id: v.staff_id,
        staff_name: buildFullName(v.staff as any),
        start_date: v.start_date,
        end_date: v.end_date
      }))

    // 5. Traer Asignaciones ya existentes
    let promptExisting: { guard_period_id: string; week_number: number; staff_id: string; staff_name: string; category: string }[] = []
    if (respectExisting) {
      const { data: existingData, error: existError } = await auth.supabase
        .from('guard_assignments')
        .select(`
          guard_period_id,
          staff_id,
          guard_periods!inner(year, week_number),
          staff!inner(first_name, last_name, positions!inner(guard_role))
        `)
        .eq('guard_periods.year', year)

      if (existError) throw new Error("Error obteniendo asignaciones previas")

      promptExisting = (existingData || [])
        .filter(e => e.staff && e.guard_periods) // Ignorar asignaciones huérfanas
        .map(e => ({
          guard_period_id: e.guard_period_id,
          week_number: (e.guard_periods as any).week_number,
          staff_id: e.staff_id,
          staff_name: buildFullName(e.staff as any),
          category: extractGuardRole((e.staff as any).positions) || 'unknown'
        }))
    }

    // --- PREPARAR DATOS DEL PROMPT ---
    const promptData: PromptData = {
      year,
      staff: promptStaff as any,
      periods: periodsData,
      vacations: promptVacations,
      existingAssignments: promptExisting,
      startDate,
      endDate,
    }

    const sysPrompt = buildSystemPrompt()
    const usrPrompt = buildUserPrompt(promptData)

    // --- LLAMAR A GROQ ---
    const groqResult = await callGroq(sysPrompt, usrPrompt, model)
    const groqResponseText = groqResult.content

    if (groqResult.truncated) {
      console.warn('Respuesta de Groq truncada — el JSON puede estar incompleto')
    }

    // --- PARSEO ROBUSTO DEL JSON ---
    let parsedData = null
    const rawLen = groqResponseText?.length || 0

    // Attempt 1: Direct parse
    try {
      parsedData = JSON.parse(groqResponseText)
    } catch {
      // Attempt 2: Strip markdown code fences
      const cleanJson = groqResponseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      try {
        parsedData = JSON.parse(cleanJson)
      } catch {
        // Attempt 3: Extract JSON object from response
        const jsonMatch = groqResponseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0])
          } catch {
            // All attempts failed
          }
        }
      }
    }

    if (!parsedData) {
      const truncatedMsg = groqResult.truncated
        ? ' La respuesta fue TRUNCADA por exceder el límite de tokens.'
        : (rawLen > 500 ? ' (respuesta posiblemente truncada)' : '')
      const preview = groqResponseText?.substring(0, 200) || '(vacío)'
      throw new Error(
        `La IA no devolvió JSON válido.${truncatedMsg} ` +
        `Longitud: ${rawLen} chars. Inicio: "${preview}..." ` +
        `Intenta de nuevo o reduce el rango de fechas.`
      )
    }

    if (!parsedData.assignments || !Array.isArray(parsedData.assignments)) {
      throw new Error(
        "La IA devolvió JSON pero sin el campo 'assignments'. " +
        `Campos recibidos: ${Object.keys(parsedData).join(', ')}. Intenta de nuevo.`
      )
    }

    // --- VALIDACIÓN ESTRICTA LOCAL ---
    const validPeriodIds = new Set(periodsData.map(p => p.id))
    const staffIdsByCategory = {
      auxilio: new Set(promptStaff.filter(s => s.category === 'auxilio').map(s => s.id)),
      tramitador: new Set(promptStaff.filter(s => s.category === 'tramitador').map(s => s.id)),
      gestor: new Set(promptStaff.filter(s => s.category === 'gestor').map(s => s.id)),
    }

    const vacationRanges = promptVacations.map(v => ({
      staff_id: v.staff_id,
      start: parseISO(v.start_date),
      end: parseISO(v.end_date)
    }))

    const periodDates = new Map<string, { start: Date; end: Date }>()
    periodsData.forEach(p => {
      periodDates.set(p.id, { start: parseISO(p.start_date), end: parseISO(p.end_date) })
    })

    const proposalValidation = validateProposal(
      parsedData.assignments as ProposalAssignment[],
      validPeriodIds,
      staffIdsByCategory,
      vacationRanges,
      periodDates
    )

    const allWarnings = [...(parsedData.warnings || []), ...proposalValidation.warnings]

    if (groqResult.truncated) {
      allWarnings.unshift('⚠️ La respuesta de la IA fue truncada. Puede haber semanas sin asignar. Revisa con cuidado o reduce el rango de fechas.')
    }

    return NextResponse.json({
      success: true,
      proposal: parsedData,
      validation: {
        valid: proposalValidation.valid,
        errors: proposalValidation.errors,
        warnings: allWarnings,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno contactando con Groq'
    console.error("Error groq-generate:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
