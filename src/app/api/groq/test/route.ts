import { NextResponse } from 'next/server'
import { requireHeadmaster } from '@/lib/auth/require-role'
import { callGroq } from '@/lib/groq/client'

export async function POST() {
  // FIX: This route previously had NO authentication check
  const auth = await requireHeadmaster()
  if (!auth.success) return auth.response

  try {
    const result = await callGroq(
      'Responde solo con JSON: {"status": "ok"}',
      'Test de conexión'
    )

    try {
      JSON.parse(result.content)
    } catch {
      if (!result.content.toLowerCase().includes('ok')) {
        throw new Error('La respuesta de la IA no es válida: ' + result.content)
      }
    }

    return NextResponse.json({
      connected: true,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error de conexión'
    console.error('Groq Test Error:', error)
    return NextResponse.json({ connected: false, error: message }, { status: 500 })
  }
}
