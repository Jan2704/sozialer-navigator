/**
 * /api/chat.ts
 *
 * Server-seitiger Chat-Endpoint.
 * Aktuell: Verarbeitet Kontext und gibt strukturierte Metadaten zurück.
 * Zukunft:  Einfach OPENAI_API_KEY oder GEMINI_API_KEY in .env eintragen,
 *           dann wird automatisch echtes LLM genutzt.
 */

import type { APIRoute } from 'astro';

const SYSTEM_PROMPT = `Du bist ein freundlicher, kompetenter KI-Assistent des "Sozialen Navigators" – 
einer deutschen Plattform für Sozialleistungen (Wohngeld, Bürgergeld, Kinderzuschlag etc.).

Regeln:
- Antworte immer auf Deutsch, kurz und klar
- Erkläre komplexe Sachverhalte einfach verständlich
- Sei einfühlsam – viele Nutzer sind in schwierigen Situationen
- Verweise bei konkreten Berechnungen auf den Smart-Calculator
- Gib keine Rechtsberatung, nur allgemeine Informationen
- Aktueller Wissenstand: 2026`;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { messages, context } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      context?: {
        income?: number;
        city?: string;
        rent?: number;
        householdSize?: number;
        children?: number;
      };
    };

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request: messages required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ──────────────────────────────────────────────────────
    // OPTION A: OpenAI (wenn OPENAI_API_KEY gesetzt ist)
    // ──────────────────────────────────────────────────────
    const openaiKey = import.meta.env.OPENAI_API_KEY;
    if (openaiKey) {
      const contextNote = context
        ? `\n\nBekannter Nutzer-Kontext: ${JSON.stringify(context)}`
        : '';

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + contextNote },
            ...messages.slice(-10), // Letzte 10 Nachrichten als Kontext
          ],
          max_tokens: 400,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const replyText = data.choices?.[0]?.message?.content ?? 'Entschuldigung, ich konnte keine Antwort generieren.';

      return new Response(
        JSON.stringify({
          reply:  replyText,
          source: 'openai',
          model:  'gpt-4o-mini',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ──────────────────────────────────────────────────────
    // OPTION B: Google Gemini (wenn GEMINI_API_KEY gesetzt ist)
    // ──────────────────────────────────────────────────────
    const geminiKey = import.meta.env.GEMINI_API_KEY;
    if (geminiKey) {
      const contextNote = context
        ? `\n\nBekannter Nutzer-Kontext: ${JSON.stringify(context)}`
        : '';

      const geminiMessages = messages.map(m => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT + contextNote }] },
            contents: geminiMessages.slice(-10),
            generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const replyText =
        data.candidates?.[0]?.content?.parts?.[0]?.text ??
        'Entschuldigung, ich konnte keine Antwort generieren.';

      return new Response(
        JSON.stringify({
          reply:  replyText,
          source: 'gemini',
          model:  'gemini-1.5-flash',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ──────────────────────────────────────────────────────
    // OPTION C: Kein LLM-Key → Signal an Client
    // (Client-seitige Brain-Engine übernimmt)
    // ──────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        reply:  null,
        source: 'local',
        note:   'No LLM key configured. Client-side engine active.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[/api/chat] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
