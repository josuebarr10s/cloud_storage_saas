import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import supabase from '../lib/supabase.js';
import { STORAGE_CONSTANTS } from '../constants/storage.js';

// Configurar el Web Worker local de PDF.js empaquetado por Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const BUCKET = STORAGE_CONSTANTS.STORAGE_BUCKET;
const fileContentCache = new Map();

// La consulta a la IA pasa por la Edge Function "box-ia" de Supabase (supabase/functions/box-ia).
// La clave de DeepSeek vive solo en el servidor como secreto; nunca va en el código del navegador.
const BOX_IA_FUNCTION = 'box-ia';

const mapUsage = (u) => ({ used: Number(u.usadas) || 0, limit: Number(u.limite) || 0 });

/**
 * Preguntas a Box IA que el usuario lleva hoy y las que permite su plan
 * (Básico 10, Pro 50, Empresarial 200). Devuelve null si no se pudo consultar.
 */
export async function getBoxIAUsage() {
  const { data, error } = await supabase.rpc('uso_ia_hoy');
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapUsage(row) : null;
}

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'csv', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css',
  'sql', 'py', 'xml', 'yml', 'yaml', 'log', 'ini', 'env', 'sh', 'bat', 'ps1'
]);

const DOCUMENT_EXTENSIONS = new Set([
  'pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'txt', 'md', 'rtf', 'odt',
  'json', 'xml', 'html', 'css', 'js', 'jsx', 'ts', 'tsx', 'sql', 'py',
  'java', 'c', 'cpp', 'yml', 'yaml', 'log', 'ini', 'env', 'sh', 'bat', 'ps1'
]);

const EXCLUDED_MULTIMEDIA_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'bmp', 'ico', 'heic', 'avif', 'tiff',
  'mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'flv', 'wmv',
  'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma',
  'zip', 'rar', '7z', 'tar', 'gz', 'exe', 'msi', 'dmg', 'iso', 'apk'
]);

/**
 * Determina si un archivo es un documento analizable por Box IA (excluyendo fotos, videos, audios y comprimidos)
 */
export function isSupportedBoxIADocument(file) {
  if (!file || file.isFolder) return false;
  const ext = (file.ext || file.name?.split('.').pop() || '').toLowerCase();
  if (EXCLUDED_MULTIMEDIA_EXTENSIONS.has(ext)) return false;
  if (['image', 'video', 'audio', 'archive', 'zip'].includes(file.type)) return false;
  if (['image', 'video', 'audio', 'archive'].includes(file.mimeCategory)) return false;
  if (['images', 'media'].includes(file.category)) return false;
  return DOCUMENT_EXTENSIONS.has(ext) || file.category === 'docs';
}

const SPANISH_STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'a',
  'en', 'con', 'por', 'para', 'sin', 'sobre', 'entre', 'hacia', 'hasta', 'desde',
  'que', 'cual', 'cuales', 'quien', 'quienes', 'como', 'donde', 'cuando', 'cuanto',
  'cuantos', 'cuanta', 'cuantas', 'es', 'son', 'era', 'eran', 'fue', 'fueron', 'ser',
  'esta', 'estan', 'este', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel',
  'y', 'o', 'u', 'e', 'ni', 'pero', 'sino', 'aunque', 'porque', 'pues', 'si',
  'no', 'mas', 'menos', 'muy', 'ya', 'tambien', 'solo', 'todo', 'todos', 'toda', 'todas',
  'otro', 'otra', 'otros', 'otras', 'mismo', 'misma', 'cada', 'algun', 'alguno', 'alguna',
  'mi', 'tu', 'su', 'mis', 'tus', 'sus', 'nuestro', 'nuestra', 'vuestro', 'se', 'le', 'les',
  'lo', 'me', 'te', 'nos', 'dice', 'dicen', 'menciona', 'mencionan', 'indica', 'indican',
  'explica', 'explicame', 'explicar', 'habla', 'hablame', 'dime', 'decir', 'mostrar',
  'muestra', 'lista', 'listar', 'enumera', 'enumerar', 'describe', 'describir', 'dar',
  'dame', 'puedes', 'podrias', 'quiero', 'saber', 'conocer', 'acerca', 'respecto',
  'documento', 'documentos', 'archivo', 'archivos', 'texto', 'pdf', 'word', 'libro',
  'pagina', 'paginas', 'seccion', 'apartado', 'capitulo', 'entrega', 'trabajo',
  'tiene', 'tienen', 'hay', 'existe', 'existen', 'segun', 'base', 'informacion', 'trata',
  'resumen', 'resumir', 'resumeme', 'sintesis', 'general', 'concreto', 'concreta'
]);

/**
 * Normaliza texto quitando tildes y pasándolo a minúsculas para comparaciones semánticas
 */
function normalizeForSearch(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Elimina símbolos de formato residuales como asteriscos (*), numerales (#) o acentos graves (`)
 * para garantizar un texto limpio, claro y profesional.
 */
export function sanitizeProfessionalText(text = '') {
  return text
    .replace(/\[Pág\.\s*\d+\]\s*/gi, '')
    .replace(/\*+/g, '')
    .replace(/`+/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-–—]\s+/gm, '• ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Obtiene la raíz léxica en español para que singular y plural coincidan siempre (ej. "actores" -> "actor")
 */
function stemSpanishWord(word = '') {
  const clean = normalizeForSearch(word).replace(/[^a-z0-9]/g, '');
  if (clean.length <= 3) return clean;

  if (clean.endsWith('ciones') || clean.endsWith('siones')) {
    return clean.slice(0, -5) + 'cion';
  }
  if (clean.endsWith('idades')) {
    return clean.slice(0, -6) + 'idad';
  }
  if (clean.endsWith('amientos') || clean.endsWith('imientos')) {
    return clean.slice(0, -2);
  }
  if (clean.endsWith('es') && clean.length > 4) {
    const beforeEs = clean.slice(0, -2);
    if (/[bcdfghjklmnprstvz]$/.test(beforeEs)) {
      return beforeEs;
    }
  }
  if (clean.endsWith('s') && !clean.endsWith('ss') && clean.length > 4) {
    return clean.slice(0, -1);
  }
  if (/[aeo]$/.test(clean) && clean.length > 5) {
    return clean.slice(0, -1);
  }
  return clean;
}

/**
 * Verifica que una línea de texto sea lenguaje humano legible y no basura binaria ni numeración de página
 */
function isReadableHumanLine(line = '') {
  const trimmed = line.trim();
  if (!trimmed) return false;

  if (/^(?:p[aá]g(?:ina)?\.?\s*)?\d+(?:\s*(?:de|\/)\s*\d+)?$/i.test(trimmed)) return false;
  if (/^[-–—\s]*\d+[-–—\s]*$/.test(trimmed)) return false;
  if (/\.{3,}\s*\d+$/.test(trimmed)) return false;

  const normalChars = (trimmed.match(/[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,;:()¿?¡!\-/"'%$@#&+*=•▪–—]/g) || []).length;
  const ratio = normalChars / trimmed.length;
  if (ratio < 0.78) return false;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length >= 6) {
    const validWords = tokens.filter((t) => /[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}|\d+/.test(t)).length;
    if (validWords / tokens.length < 0.45) return false;
  }

  return true;
}

/**
 * Detecta si una línea es un título o encabezado de sección dentro del documento
 */
function isHeadingLine(line = '') {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 90 || trimmed.length < 3) return false;
  if (trimmed.endsWith('.') && trimmed.length > 50) return false;
  if (trimmed.endsWith(',') || trimmed.endsWith(';')) return false;

  if (/^(?:\d+(?:\.\d+)*\.?|[IVXLC]+\.)\s+[A-ZÁÉÍÓÚÑ]/.test(trimmed)) {
    return trimmed.split(/\s+/).length <= 12;
  }

  const norm = normalizeForSearch(trimmed);
  const headingRegex = /^(?:introduccion|resumen|descripcion general|planteamiento|problematica|justificacion|objetivo|objetivos|objetivo general|objetivos especificos|alcance|alcances|actores|identificacion de actores|descripcion de actores|catalogo de actores|usuarios del sistema|roles|requisitos|requerimientos|requisitos funcionales|requisitos no funcionales|historias de usuario|casos de uso|diagrama|arquitectura|modelo|diseno|presupuesto|costos|conclusiones|recomendaciones|bibliografia|anexos|capitulo|parte|prologo|epilogo)\b/;
  if (headingRegex.test(norm) && trimmed.split(/\s+/).length <= 10 && !trimmed.includes(': ')) {
    return true;
  }

  const lettersOnly = trimmed.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
  if (
    lettersOnly.length >= 4 &&
    lettersOnly === lettersOnly.toUpperCase() &&
    trimmed.split(/\s+/).length <= 9
  ) {
    return true;
  }

  return false;
}

/**
 * Detecta si una línea inicia un elemento de lista o una definición ("• Actor:", "1) Cliente:", "Administrador: ...")
 */
function isBulletOrItemStart(line = '') {
  const trimmed = line.trim();
  if (/^[•▪◦‣*–—\-]\s+\S/.test(trimmed)) return true;
  if (/^(?:\d+|[a-zA-Z])[)\]]\s+\S/.test(trimmed)) return true;
  if (/^(?:RF|RNF|HU|CU|ACT)[-\s]?\d+/i.test(trimmed)) return true;
  if (/^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s/()]{1,42}:\s+\S/.test(trimmed)) return true;
  return false;
}

/**
 * Une los renglones visuales sueltos de un PDF/Word en párrafos completos y coherentes
 */
function buildParagraphsFromLines(rawLines = []) {
  const cleanLines = rawLines
    .map((l) =>
      l
        .replace(/^\[Pág\.\s*\d+\]\s*/i, '')
        .replace(/\*+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(isReadableHumanLine);

  const paragraphs = [];
  let currentPara = '';

  const flushParagraph = () => {
    const text = currentPara.trim();
    if (text) {
      paragraphs.push(text);
    }
    currentPara = '';
  };

  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];

    if (isHeadingLine(line)) {
      flushParagraph();
      paragraphs.push(line);
      continue;
    }

    if (isBulletOrItemStart(line)) {
      flushParagraph();
      currentPara = line.replace(/^[•▪◦‣*–—\-]\s*/, '• ');
      continue;
    }

    if (!currentPara) {
      currentPara = line;
      continue;
    }

    if (currentPara.endsWith('-') && /^[a-záéíóúñ]/.test(line)) {
      currentPara = currentPara.slice(0, -1) + line;
    } else {
      currentPara += ' ' + line;
    }

    const nextLine = cleanLines[i + 1] || '';
    const endsWithStop = /[.!?]$/.test(line);
    const nextStartsNewSentence = /^[A-ZÁÉÍÓÚÑ¿¡]/.test(nextLine);
    if (endsWithStop && currentPara.length >= 220 && nextStartsNewSentence) {
      flushParagraph();
    }
  }
  flushParagraph();

  return { cleanLines, paragraphs };
}

/**
 * Descomprime un bloque DEFLATE crudo en el navegador usando DecompressionStream (para .docx y .xlsx)
 */
async function inflateRaw(uint8Data) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream no disponible en este navegador.');
  }
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(uint8Data);
  writer.close();

  const reader = ds.readable.getReader();
  const chunks = [];
  let totalLen = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLen += value.byteLength;
  }
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/**
 * Lector ligero de archivos ZIP en memoria (para extraer XML de .docx y .xlsx)
 */
async function extractZipEntries(arrayBuffer, targetNames = []) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const decoder = new TextDecoder('utf-8');
  const results = {};

  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return results;

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  let cdOffset = view.getUint32(eocdOffset + 16, true);

  for (let e = 0; e < totalEntries; e++) {
    if (cdOffset + 46 > bytes.length || view.getUint32(cdOffset, true) !== 0x02014b50) break;
    const compression = view.getUint16(cdOffset + 10, true);
    const compSize = view.getUint32(cdOffset + 20, true);
    const nameLen = view.getUint16(cdOffset + 28, true);
    const extraLen = view.getUint16(cdOffset + 30, true);
    const commentLen = view.getUint16(cdOffset + 32, true);
    const localHeaderOffset = view.getUint32(cdOffset + 42, true);

    const fileName = decoder.decode(bytes.subarray(cdOffset + 46, cdOffset + 46 + nameLen));
    cdOffset += 46 + nameLen + extraLen + commentLen;

    const shouldExtract = targetNames.some((pattern) =>
      typeof pattern === 'string' ? fileName === pattern : pattern.test(fileName)
    );
    if (!shouldExtract) continue;

    if (localHeaderOffset + 30 > bytes.length || view.getUint32(localHeaderOffset, true) !== 0x04034b50) continue;
    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const compressedSlice = bytes.subarray(dataStart, dataStart + compSize);

    try {
      if (compression === 0) {
        results[fileName] = decoder.decode(compressedSlice);
      } else if (compression === 8) {
        const inflated = await inflateRaw(compressedSlice);
        results[fileName] = decoder.decode(inflated);
      }
    } catch (err) {
      console.warn(`No se pudo descomprimir entrada ZIP ${fileName}:`, err);
    }
  }

  return results;
}

function decodeXmlEntities(str = '') {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractDocxText(arrayBuffer) {
  const entries = await extractZipEntries(arrayBuffer, ['word/document.xml']);
  const xml = entries['word/document.xml'];
  if (!xml) return '';

  const paragraphs = [];
  const pRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let pMatch;
  while ((pMatch = pRegex.exec(xml)) !== null) {
    const pBlock = pMatch[0];
    const tRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let tMatch;
    let line = '';
    while ((tMatch = tRegex.exec(pBlock)) !== null) {
      line += decodeXmlEntities(tMatch[1]);
    }
    if (line.trim()) {
      paragraphs.push(line.trim());
    }
  }
  return paragraphs.join('\n');
}

async function extractXlsxText(arrayBuffer) {
  const entries = await extractZipEntries(arrayBuffer, [
    'xl/sharedStrings.xml',
    /^xl\/worksheets\/sheet\d+\.xml$/
  ]);

  const sharedStrings = [];
  if (entries['xl/sharedStrings.xml']) {
    const siRegex = /<si[\s>][\s\S]*?<\/si>/g;
    let siMatch;
    while ((siMatch = siRegex.exec(entries['xl/sharedStrings.xml'])) !== null) {
      const tRegex = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
      let tMatch;
      let val = '';
      while ((tMatch = tRegex.exec(siMatch[0])) !== null) {
        val += decodeXmlEntities(tMatch[1]);
      }
      sharedStrings.push(val);
    }
  }

  const lines = [];
  const sheetKeys = Object.keys(entries).filter((k) => k.startsWith('xl/worksheets/')).sort();

  for (const sheetKey of sheetKeys) {
    const xml = entries[sheetKey];
    const rowRegex = /<row[\s>][\s\S]*?<\/row>/g;
    let rMatch;
    while ((rMatch = rowRegex.exec(xml)) !== null) {
      const rowXml = rMatch[0];
      const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
      let cMatch;
      const rowCells = [];
      while ((cMatch = cellRegex.exec(rowXml)) !== null) {
        const attrs = cMatch[1] || '';
        const inner = cMatch[2] || '';
        const typeMatch = /t="([^"]+)"/.exec(attrs);
        const cellType = typeMatch ? typeMatch[1] : '';

        if (cellType === 'inlineStr') {
          const tMatch = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/.exec(inner);
          if (tMatch && tMatch[1].trim()) rowCells.push(decodeXmlEntities(tMatch[1].trim()));
        } else {
          const vMatch = /<v>([\s\S]*?)<\/v>/.exec(inner);
          if (vMatch) {
            const rawVal = vMatch[1].trim();
            if (cellType === 's') {
              const idx = parseInt(rawVal, 10);
              if (!Number.isNaN(idx) && sharedStrings[idx]) {
                rowCells.push(sharedStrings[idx]);
              }
            } else if (rawVal) {
              rowCells.push(decodeXmlEntities(rawVal));
            }
          }
        }
      }
      if (rowCells.length > 0) {
        lines.push(rowCells.join(' | '));
      }
    }
  }

  return lines.join('\n');
}

/**
 * Extrae el texto limpio de un archivo PDF usando Mozilla PDF.js (sin prefijos de página)
 */
async function extractPdfTextWithPdfJs(arrayBuffer) {
  const uint8 = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({
    data: uint8,
    useSystemFonts: true,
    isEvalSupported: false
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages || 0;
  const rawLines = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items || [];

    const rowsMap = new Map();
    for (const item of items) {
      const str = item.str || '';
      if (!str.trim()) continue;
      const y = Math.round((item.transform?.[5] || 0) / 3) * 3;
      const x = item.transform?.[4] || 0;
      if (!rowsMap.has(y)) {
        rowsMap.set(y, []);
      }
      rowsMap.get(y).push({ x, str: str.trim() });
    }

    const sortedYs = Array.from(rowsMap.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const rowItems = rowsMap.get(y).sort((a, b) => a.x - b.x);
      const lineStr = rowItems.map((it) => it.str).join(' ').replace(/\s{2,}/g, ' ').trim();
      if (lineStr && isReadableHumanLine(lineStr)) {
        rawLines.push(lineStr);
      }
    }
  }

  return { rawLines, pageCount: numPages };
}

/**
 * Descarga y extrae el contenido limpio de un archivo almacenado en Nimbox Cloud
 */
export async function readNimboxFileForAI(file) {
  if (!file || !file.file_path) {
    throw new Error('Archivo inválido o sin ruta en la nube.');
  }

  const cacheKey = `v6_${file.id}_${file.updated || ''}_${file.size_bytes || 0}`;
  if (fileContentCache.has(cacheKey)) {
    return fileContentCache.get(cacheKey);
  }

  const ext = (file.ext || file.name?.split('.').pop() || '').toLowerCase();

  let blob = null;
  const { data, error } = await supabase.storage.from(BUCKET).download(file.file_path);
  if (!error && data) {
    blob = data;
  } else {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(file.file_path, 1800);
    if (signed?.signedUrl) {
      const resp = await fetch(signed.signedUrl);
      blob = await resp.blob();
    }
  }

  if (!blob) {
    throw new Error(`No se pudo descargar "${file.name}" para su lectura.`);
  }

  const arrayBuffer = await blob.arrayBuffer();
  let rawLines = [];
  let pageCount = 0;
  let sourceKind = 'text';

  if (ext === 'pdf' || file.mimeCategory === 'pdf') {
    sourceKind = 'pdf';
    const pdfData = await extractPdfTextWithPdfJs(arrayBuffer);
    rawLines = pdfData.rawLines;
    pageCount = pdfData.pageCount;
  } else if (ext === 'docx') {
    sourceKind = 'docx';
    const docxText = await extractDocxText(arrayBuffer);
    rawLines = docxText.split('\n').map((l) => l.trim()).filter(isReadableHumanLine);
  } else if (ext === 'xlsx') {
    sourceKind = 'xlsx';
    const xlsxText = await extractXlsxText(arrayBuffer);
    rawLines = xlsxText.split('\n').map((l) => l.trim()).filter(Boolean);
  } else if (TEXT_EXTENSIONS.has(ext) || file.mimeCategory === 'text') {
    sourceKind = 'text';
    const decoded = new TextDecoder('utf-8').decode(arrayBuffer).replace(/\r\n/g, '\n');
    rawLines = decoded.split('\n').map((l) => l.trim()).filter(Boolean);
  } else {
    sourceKind = 'other';
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer.slice(0, 150000));
    rawLines = raw.split('\n').map((l) => l.trim()).filter(isReadableHumanLine);
  }

  const { cleanLines, paragraphs } = buildParagraphsFromLines(rawLines);
  const fullText = paragraphs.join('\n\n').trim();
  const wordCount = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;

  const parsed = {
    id: file.id,
    name: file.name,
    ext,
    size: file.size,
    updated: file.updated,
    sourceKind,
    pageCount,
    text: fullText,
    lines: cleanLines,
    paragraphs,
    wordCount,
    lineCount: paragraphs.length
  };

  fileContentCache.set(cacheKey, parsed);
  return parsed;
}

/**
 * Prepara el contenido completo o más representativo del documento/libro para enviarlo a DeepSeek
 * aprovechando su amplia ventana de contexto (hasta 48,000 caracteres por consulta).
 */
function buildDeepSeekDocumentContext(question, loadedDocs, maxChars = 48000) {
  const perDocBudget = Math.floor(maxChars / Math.max(1, loadedDocs.length));
  const qNorm = normalizeForSearch(question);
  const queryStems = qNorm
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !SPANISH_STOPWORDS.has(w))
    .map(stemSpanishWord);

  return loadedDocs
    .map((doc) => {
      const header = `=== DOCUMENTO: "${doc.name}" (${doc.pageCount ? `${doc.pageCount} páginas, ` : ''}${doc.wordCount} palabras) ===`;

      // Si el documento entero cabe en el presupuesto (hasta ~8,000 palabras), enviarlo 100% íntegro
      if (doc.text.length <= perDocBudget) {
        return `${header}\n\n${doc.text}`;
      }

      // Para libros o documentos muy extensos (>48,000 caracteres):
      // 1) Incluir el inicio completo del libro/documento (25% del presupuesto)
      const introBudget = Math.floor(perDocBudget * 0.25);
      const introText = doc.text.slice(0, introBudget);

      // 2) Muestrear pasajes distribuidos a lo largo de todo el libro (inicio, desarrollo, nudo y desenlace: 35%)
      const middleBudget = Math.floor(perDocBudget * 0.35);
      const totalParas = doc.paragraphs.length;
      const sampleCount = 12;
      const step = Math.max(1, Math.floor(totalParas / sampleCount));
      const sampledParas = [];
      let sampledLen = 0;
      for (let i = 0; i < totalParas && sampledLen < middleBudget; i += step) {
        const chunk = doc.paragraphs.slice(i, i + 3).join('\n');
        sampledParas.push(chunk);
        sampledLen += chunk.length;
      }

      // 3) Incluir los párrafos más relevantes para los términos de la pregunta (40% del presupuesto)
      const relevantBudget = perDocBudget - introText.length - sampledLen;
      const scoredParas = [];
      for (let i = 0; i < doc.paragraphs.length; i++) {
        const p = doc.paragraphs[i];
        const pNorm = normalizeForSearch(p);
        let score = 0;
        for (const stem of queryStems) {
          if (stem.length >= 3 && pNorm.includes(stem)) score += 20;
        }
        // Si pregunta por actores o personajes en un libro, priorizar párrafos con nombres propios y diálogos
        if (/\b(actor|actores|personaje|personajes|protagonista|quienes)\b/.test(qNorm)) {
          const properNouns = (p.match(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}/g) || []).length;
          if (properNouns >= 2) score += properNouns * 3;
        }
        if (score > 0) {
          const windowText = doc.paragraphs.slice(i, Math.min(doc.paragraphs.length, i + 3)).join('\n');
          scoredParas.push({ idx: i, text: windowText, score });
        }
      }

      scoredParas.sort((a, b) => b.score - a.score);
      const selectedRelevant = [];
      let relLen = 0;
      for (const item of scoredParas) {
        if (relLen + item.text.length > relevantBudget) break;
        selectedRelevant.push(item);
        relLen += item.text.length;
      }
      selectedRelevant.sort((a, b) => a.idx - b.idx);

      return (
        `${header}\n\n` +
        `[Inicio del documento]:\n${introText}\n\n` +
        `[Recorrido general a lo largo del documento]:\n${sampledParas.join('\n\n')}\n\n` +
        (selectedRelevant.length > 0
          ? `[Pasajes específicos relacionados con la consulta]:\n${selectedRelevant.map((r) => r.text).join('\n\n')}`
          : '')
      );
    })
    .join('\n\n====================\n\n');
}

/**
 * Consulta a Box IA utilizando DeepSeek para analizar el documento y responder concretamente a la pregunta.
 */
export async function askBoxIA({ question, selectedFiles, conversationHistory = [] }) {
  if (!selectedFiles || selectedFiles.length === 0) {
    throw new Error('Selecciona al menos un archivo de tu nube para que Box IA pueda analizarlo.');
  }

  // 1. Extraer texto limpio estructurado en párrafos completos
  const loadedDocs = await Promise.all(selectedFiles.map((f) => readNimboxFileForAI(f)));

  const totalWords = loadedDocs.reduce((acc, d) => acc + (d.wordCount || 0), 0);
  if (totalWords === 0) {
    return {
      answer:
        `He abierto ${loadedDocs.map((d) => `"${d.name}"`).join(', ')}, pero no contiene texto seleccionable (por ejemplo, es una imagen o un PDF escaneado únicamente como fotografía sin texto digital).`,
      loadedDocs
    };
  }

  const fullDocumentContext = buildDeepSeekDocumentContext(question, loadedDocs, 48000);

  // El historial llega con la pregunta actual al final: se manda solo lo anterior
  const recentHistory = conversationHistory
    .slice(-5, -1)
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1200) }));

  // 2. Consulta segura: la Edge Function valida la sesión y llama a DeepSeek con la clave del servidor
  const { data, error } = await supabase.functions.invoke(BOX_IA_FUNCTION, {
    body: { question, context: fullDocumentContext, history: recentHistory }
  });

  if (error) {
    let message = 'No se pudo consultar Box IA. Intenta de nuevo.';
    let uso = null;
    try {
      const detail = await error.context?.json();
      if (detail?.error) message = detail.error;
      if (detail?.uso) uso = mapUsage(detail.uso);
    } catch {
      // respuesta sin cuerpo JSON: se deja el mensaje general
    }
    const boxError = new Error(message);
    boxError.usage = uso;
    throw boxError;
  }

  const rawReply = data?.answer || '';
  const cleanReply = sanitizeProfessionalText(rawReply);

  return {
    answer: cleanReply || 'No se pudo generar una respuesta para esta consulta.',
    usage: data?.uso ? mapUsage(data.uso) : null,
    loadedDocs
  };
}
