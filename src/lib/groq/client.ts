// src/lib/groq/client.ts

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason?: string;
  }>;
}

export interface GroqResult {
  content: string;
  truncated: boolean;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

export async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  model?: string,
  jsonMode = true,    // false → texto libre (tablón); true → json_object (guardias)
  maxTokens = 12000   // reducir para llamadas de texto corto (tablón: 350)
): Promise<GroqResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY no configurada. Añádela en .env.local');

  const groqModel = model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const messages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Timeout de 90 segundos para evitar que la request cuelgue indefinidamente
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    let response: Response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: groqModel,
          messages,
          temperature: 0.2,
          max_tokens: maxTokens,
          ...(jsonMode && { response_format: { type: 'json_object' } }),
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('La IA tardó demasiado en responder (>90s). Inténtalo de nuevo.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    // Rate limit — retry after delay
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter ? Math.min(parseInt(retryAfter, 10) * 1000, 10000) : RETRY_DELAY_MS;
      console.warn(`Groq rate limit (429), reintentando en ${waitMs}ms (intento ${attempt + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new Error('Groq está saturado (rate limit). Espera unos segundos e inténtalo de nuevo.');
      }
      throw new Error(`Groq API error ${response.status}: ${errorText}`);
    }

    const data: GroqResponse = await response.json();
    const content = data.choices[0]?.message?.content || '';
    const truncated = data.choices[0]?.finish_reason === 'length';

    if (truncated) {
      console.warn('Groq response was truncated (finish_reason=length). Token budget may be insufficient.');
    }

    return { content, truncated };
  }

  throw lastError || new Error('Groq: reintentos agotados');
}
