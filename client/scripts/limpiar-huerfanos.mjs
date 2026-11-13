// Limpieza de archivos huérfanos en el bucket nimbox-files.
//
// Cuando se elimina un usuario, la base de datos borra en cascada su perfil, carpetas y
// archivos (las filas), pero los archivos físicos de Storage se quedan: Supabase solo deja
// borrarlos con su API. Este script encuentra:
//   1. Carpetas de usuarios que ya no existen ({id_usuario}/... sin fila en public.usuario).
//   2. Archivos sueltos de usuarios que sí existen, que ninguna fila de archivo ni de
//      archivo_version menciona (por ejemplo, restos de una subida que falló a medias).
//
// Uso (desde client/, con client/.env.respaldo.local igual que el respaldo):
//   node scripts/limpiar-huerfanos.mjs            -> solo muestra lo que encontró, no borra nada
//   node scripts/limpiar-huerfanos.mjs --borrar   -> borra lo que encontró
// Conviene correr antes npm run respaldo.

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLIENT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUCKET = 'nimbox-files';
const PAGE = 1000;
const BORRAR = process.argv.includes('--borrar');
// Archivos subidos hace menos de esto no se tocan: podrían ser una subida en curso
const MARGEN_MS = 60 * 60 * 1000;

async function cargarCredenciales() {
  const env = { ...process.env };
  try {
    const texto = await readFile(join(CLIENT_DIR, '.env.respaldo.local'), 'utf8');
    for (const linea of texto.split(/\r?\n/)) {
      const m = linea.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // sin archivo: se usan solo las variables de entorno
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (en client/.env.respaldo.local o como variables de entorno).');
    process.exit(1);
  }
  return { url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_ROLE_KEY };
}

async function columna(supabase, tabla, col) {
  const valores = new Set();
  for (let desde = 0; ; desde += PAGE) {
    const { data, error } = await supabase.from(tabla).select(col).range(desde, desde + PAGE - 1);
    if (error) throw new Error(`No se pudo leer ${tabla}: ${error.message}`);
    data.forEach((fila) => valores.add(fila[col]));
    if (data.length < PAGE) break;
  }
  return valores;
}

// Lista los objetos bajo un prefijo, con su fecha (una entrada sin id es una carpeta)
async function listar(supabase, prefijo = '') {
  const objetos = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefijo, { limit: PAGE, offset });
    if (error) throw new Error(`No se pudo listar "${prefijo || '/'}": ${error.message}`);
    for (const e of data) {
      const ruta = prefijo ? `${prefijo}/${e.name}` : e.name;
      if (e.id === null) objetos.push(...(await listar(supabase, ruta)));
      else objetos.push({ ruta, creado: e.created_at, bytes: e.metadata?.size || 0 });
    }
    if (data.length < PAGE) break;
  }
  return objetos;
}

const { url, key } = await cargarCredenciales();
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

console.log(BORRAR ? 'Modo BORRAR\n' : 'Modo revisión (no se borra nada; usa --borrar para borrar)\n');

const usuarios = await columna(supabase, 'usuario', 'id_usuario');
const rutasConocidas = new Set([
  ...(await columna(supabase, 'archivo', 'ruta_storage')),
  ...(await columna(supabase, 'archivo_version', 'ruta_storage')),
]);
const objetos = await listar(supabase);
const ahora = Date.now();

const deEliminados = objetos.filter((o) => !usuarios.has(o.ruta.split('/')[0]));
const sueltos = objetos.filter((o) =>
  usuarios.has(o.ruta.split('/')[0]) &&
  !rutasConocidas.has(o.ruta) &&
  (!o.creado || ahora - new Date(o.creado).getTime() > MARGEN_MS));

const mb = (lista) => (lista.reduce((t, o) => t + o.bytes, 0) / 1024 / 1024).toFixed(1);
const carpetas = [...new Set(deEliminados.map((o) => o.ruta.split('/')[0]))];
console.log(`Archivos en el bucket: ${objetos.length}`);
console.log(`1. De usuarios eliminados: ${deEliminados.length} archivos (${mb(deEliminados)} MB) en ${carpetas.length} carpeta(s)`);
carpetas.forEach((c) => console.log(`     ${c}/`));
console.log(`2. Sueltos (sin fila en la base de datos): ${sueltos.length} archivos (${mb(sueltos)} MB)`);
sueltos.slice(0, 20).forEach((o) => console.log(`     ${o.ruta}`));
if (sueltos.length > 20) console.log(`     ... y ${sueltos.length - 20} más`);

const aBorrar = [...deEliminados, ...sueltos].map((o) => o.ruta);
if (!BORRAR || aBorrar.length === 0) {
  console.log(aBorrar.length ? '\nNo se borró nada. Para borrarlos: node scripts/limpiar-huerfanos.mjs --borrar' : '\nNo hay nada que limpiar.');
  process.exit(0);
}

let borrados = 0;
for (let i = 0; i < aBorrar.length; i += 100) {
  const lote = aBorrar.slice(i, i + 100);
  const { error } = await supabase.storage.from(BUCKET).remove(lote);
  if (error) {
    console.error(`  ! Falló un lote: ${error.message}`);
  } else {
    borrados += lote.length;
  }
}
console.log(`\nBorrados: ${borrados} de ${aBorrar.length} archivos.`);
