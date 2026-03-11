/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/groq/test/route.ts
import { NextResponse } from 'next/server';
import { callGroq } from '@/lib/groq/client';

export async function POST() {
  try {
    const response = await callGroq(
      'Responde solo con JSON: {"status": "ok"}',
      'Test de conexión'
    );
    // Verificar si la respuesta es un JSON válido
    try {
      JSON.parse(response);
    } catch (e) {
      // Si no es JSON, a veces Groq devuelve texto plano, aceptamos si contiene "ok"
      if (!response.toLowerCase().includes('ok')) {
        throw new Error('La respuesta de la IA no es válida: ' + response);
      }
    }
    
    return NextResponse.json({ 
      connected: true, 
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile' 
    });
  } catch (error: any) {
    console.error('Groq Test Error:', error);
    return NextResponse.json({ 
      connected: false, 
      error: error.message 
    }, { status: 500 });
  }
}
