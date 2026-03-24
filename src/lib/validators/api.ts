// src/lib/validators/api.ts
// Centralized API request validation helper
import { NextResponse } from "next/server"
import { z } from "zod"

/**
 * Validates a request body against a Zod schema.
 * Returns the parsed data or a NextResponse with 400 status.
 */
export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse }
> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = JSON.parse(result.error.message)
      const firstError = errors[0]
      const field = firstError?.path?.join(".") || "campo"
      const message = firstError?.message || "Datos inválidos"

      return {
        success: false,
        response: NextResponse.json(
          { error: `${field}: ${message}`, details: errors },
          { status: 400 }
        ),
      }
    }

    return { success: true, data: result.data }
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Body JSON inválido o vacío" },
        { status: 400 }
      ),
    }
  }
}

/**
 * Validates URL search params against a Zod schema.
 */
export function validateQuery<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
):
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse }
{
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  const result = schema.safeParse(params)

  if (!result.success) {
    const errors = JSON.parse(result.error.message)
    return {
      success: false,
      response: NextResponse.json(
        { error: "Parámetros de consulta inválidos", details: errors },
        { status: 400 }
      ),
    }
  }

  return { success: true, data: result.data }
}
