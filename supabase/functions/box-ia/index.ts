// Edge Function "box-ia": intermediario seguro entre Box IA y DeepSeek.
// La clave de DeepSeek vive solo aquí, como secreto de Supabase (DEEPSEEK_API_KEY);
// nunca llega al navegador ni al repositorio.
// Solo atiende a usuarios con sesión iniciada en Nimbox, y arma ella misma el mensaje
// para DeepSeek, así nadie puede usarla como acceso libre a la IA.
import { createClient } from 'npm:@supabase/supabase-js@2';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MAX_CONTEXT_CHARS = 50000;   // texto de los documentos (el cliente arma ~48 000)
const MAX_QUESTION_CHARS = 2000;
const MAX_HISTORY_MESSAGES = 4;
const MAX_HISTORY_CHARS = 1200;    // por mensaje

const SYSTEM_PROMPT =
  'Eres Box IA, el asistente inteligente de análisis de documentos y libros de Nimbox Cloud.\n' +
  'REGLAS OBLIGATORIAS DE RESPUESTA:\n' +
  '1. Analiza a fondo la pregunta del usuario y el contenido del documento o libro proporcionado, y devuelve una respuesta CONCRETA, DIRECTA y SINTETIZADA con tus propias palabras.\n' +
  '2. NUNCA copies ni pegues extractos literales del libro o PDF. Tu trabajo es razonar sobre el contenido y explicarlo claramente.\n' +
  '3. Si el usuario pregunta por los "actores" o "personajes" de un libro, historia o documento, identifica los nombres de los personajes, protagonistas o actores que participan en la obra o sistema y explica brevemente quién es cada uno y su rol en la historia o proyecto.\n' +
  '4. Si el usuario pregunta de qué trata el documento o pide un resumen, redacta un resumen ejecutivo concreto, completo y bien estructurado de todo el archivo.\n' +
  '5. Nunca dejes frases a medias ni uses puntos suspensivos (...) para cortar oraciones.\n' +
  '6. PROHIBIDO usar el símbolo de asterisco (*), numerales (#) o números de página ([Pág. X]) dentro de los párrafos. Para listas usa únicamente el símbolo "•" al inicio de la línea (por ejemplo: "• Nombre: Explicación completa.").\n' +
  '7. Responde solo sobre el contenido de los documentos proporcionados. Si te piden algo que no tiene relación con ellos, indica amablemente que solo puedes ayudar con los documentos seleccionados.';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  // 1. Solo usuarios con sesión: se valida el token con Supabase Auth
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Inicia sesión para usar Box IA.' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return json({ error: 'Tu sesión no es válida. Vuelve a iniciar sesión.' }, 401);

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) return json({ error: 'Box IA no está configurado en el servidor.' }, 500);

  // 2. Validar lo que manda el cliente
  let body: { question?: unknown; context?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  const context = typeof body.context === 'string' ? body.context : '';
  if (!question) return json({ error: 'Escribe una pregunta.' }, 400);
  if (question.length > MAX_QUESTION_CHARS) return json({ error: 'La pregunta es demasiado larga.' }, 400);
  if (!context.trim()) return json({ error: 'No hay contenido de documentos para analizar.' }, 400);

  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((m): m is { role: string; content: string } =>
      !!m && typeof m === 'object' &&
      ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') &&
      typeof (m as { content?: unknown }).content === 'string')
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_HISTORY_CHARS) }));

  const userMessage =
    `CONTENIDO DEL DOCUMENTO SELECCIONADO EN NIMBOX CLOUD:\n\n${context.slice(0, MAX_CONTEXT_CHARS)}\n\n` +
    `---\nPREGUNTA DEL USUARIO: ${question}\n\n` +
    'Responde de forma concreta, completa y directamente enfocada en lo que se pregunta (sin usar asteriscos * ni copiar extractos literales):';

  // 3. Llamar a DeepSeek con la clave del servidor (modelo y límites fijos)
  let deepseek: Response;
  try {
    deepseek = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: userMessage }],
        temperature: 0.25,
        max_tokens: 1200,
      }),
    });
  } catch {
    return json({ error: 'No se pudo conectar con el servicio de IA. Intenta de nuevo.' }, 502);
  }

  if (!deepseek.ok) {
    // No se reenvía el detalle de DeepSeek al navegador
    console.error('DeepSeek respondió', deepseek.status, (await deepseek.text()).slice(0, 300));
    const message = deepseek.status === 402
      ? 'El servicio de IA no tiene saldo disponible en este momento.'
      : deepseek.status === 429
        ? 'Box IA recibió demasiadas consultas. Espera un momento e intenta de nuevo.'
        : 'El servicio de IA no pudo responder. Intenta de nuevo.';
    return json({ error: message }, 502);
  }

  const data = await deepseek.json();
  const answer = data?.choices?.[0]?.message?.content || '';
  return json({ answer });
});
