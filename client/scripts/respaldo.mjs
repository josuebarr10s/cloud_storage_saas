// Respaldo completo de Nimbox: tablas, cuentas de usuario y archivos del bucket.
//
// Uso (desde la carpeta client/):
//   1. Crear client/.env.respaldo.local con:
//        SUPABASE_URL=https://<proyecto>.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY=<clave service_role>
//      (Supabase > Project Settings > API Keys). Ese archivo no se sube al repositorio.
//   2. node scripts/respaldo.mjs
//
// Resultado: client/respaldos/<fecha-hora>/
//   tablas/<tabla>.json   filas de cada tabla del esquema public
//   usuarios.json         cuentas de Supabase Auth (sin contraseñas: Supabase no las entrega)
//   storage/...           archivos del bucket nimbox-files con sus rutas originales
//   resumen.json          conteos y tamaño total
//
// La carpeta respaldos/ contiene datos personales: no se sube al repositorio y no se comparte.
// La clave service_role da acceso total al proyecto: nunca va en el código ni en el frontend.

import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = resolve(HERE, '..');
const BUCKET = 'nimbox-files';
const PAGE = 1000;
const TABLAS = [
  'rol', 'plan', 'usuario', 'almacenamiento', 'suscripcion', 'pago', 'carpeta', 'archivo',
  'archivo_version', 'enlace_compartido', 'acceso_compartido', 'uso_ia', 'intento_enlace',
];

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

async function respaldarTabla(supabase, tabla, carpeta) {
  const filas = [];
  for (let desde = 0; ; desde += PAGE) {
    const { data, error } = await supabase.from(tabla).select('*').range(desde, desde + PAGE - 1);
    if (error) {
      console.warn(`  ! ${tabla}: ${error.message} (se omite)`);
      return null;
    }
    filas.push(...data);
    if (data.length < PAGE) break;
  }
  await writeFile(join(carpeta, `${tabla}.json`), JSON.stringify(filas, null, 2));
  return filas.length;
}

async function respaldarUsuarios(supabase, carpeta) {
  const usuarios = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) throw new Error(`No se pudieron leer las cuentas: ${error.message}`);
    usuarios.push(...data.users.map((u) => ({
      id: u.id,
      email: u.email,
      email_confirmed_at: u.email_confirmed_at,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      user_metadata: u.user_metadata,
    })));
    if (data.users.length < PAGE) break;
  }
  await writeFile(join(carpeta, 'usuarios.json'), JSON.stringify(usuarios, null, 2));
  return usuarios.length;
}

// Recorre el bucket carpeta por carpeta (en Storage, una entrada sin id es una carpeta)
async function listarArchivos(supabase, prefijo = '') {
  const rutas = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefijo, { limit: PAGE, offset });
    if (error) throw new Error(`No se pudo listar "${prefijo || '/'}": ${error.message}`);
    for (const entrada of data) {
      const ruta = prefijo ? `${prefijo}/${entrada.name}` : entrada.name;
      if (entrada.id === null) rutas.push(...(await listarArchivos(supabase, ruta)));
      else rutas.push(ruta);
    }
    if (data.length < PAGE) break;
  }
  return rutas;
}

async function respaldarArchivos(supabase, carpeta) {
  const rutas = await listarArchivos(supabase);
  let bytes = 0;
  const fallidos = [];
  for (const [i, ruta] of rutas.entries()) {
    const { data, error } = await supabase.storage.from(BUCKET).download(ruta);
    if (error || !data) {
      fallidos.push(ruta);
      continue;
    }
    const contenido = Buffer.from(await data.arrayBuffer());
    const destino = join(carpeta, ...ruta.split('/'));
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, contenido);
    bytes += contenido.length;
    if ((i + 1) % 20 === 0 || i + 1 === rutas.length) console.log(`  archivos: ${i + 1}/${rutas.length}`);
  }
  return { archivos: rutas.length - fallidos.length, bytes, fallidos };
}

const { url, key } = await cargarCredenciales();
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const sello = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const destino = join(CLIENT_DIR, 'respaldos', sello);
await mkdir(join(destino, 'tablas'), { recursive: true });
await mkdir(join(destino, 'storage'), { recursive: true });
console.log(`Respaldo en ${destino}\n`);

console.log('1/3 Tablas');
const tablas = {};
for (const tabla of TABLAS) {
  const n = await respaldarTabla(supabase, tabla, join(destino, 'tablas'));
  if (n !== null) {
    tablas[tabla] = n;
    console.log(`  ${tabla}: ${n} filas`);
  }
}

console.log('\n2/3 Cuentas de usuario');
const usuarios = await respaldarUsuarios(supabase, destino);
console.log(`  ${usuarios} cuentas`);

console.log('\n3/3 Archivos del bucket');
const storage = await respaldarArchivos(supabase, join(destino, 'storage'));
console.log(`  ${storage.archivos} archivos (${(storage.bytes / 1024 / 1024).toFixed(1)} MB)`);
if (storage.fallidos.length) console.warn(`  ! No se pudieron bajar ${storage.fallidos.length}: ${storage.fallidos.join(', ')}`);

await writeFile(join(destino, 'resumen.json'), JSON.stringify({
  fecha: new Date().toISOString(), proyecto: url, tablas, usuarios, storage,
}, null, 2));
console.log('\nRespaldo terminado.');
