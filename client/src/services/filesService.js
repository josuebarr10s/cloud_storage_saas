import supabase from '../lib/supabase.js';
import { STORAGE_CONSTANTS } from '../constants/storage.js';
import { formatBytes, formatDate } from '../utils/formatters.js';
import { detectCategoryAndType } from '../strategies/fileCategoryStrategy.js';
import { calculateRetentionDays } from '../strategies/retentionStrategy.js';
import { FileFactory, FolderFactory } from '../factories/entityFactory.js';

const BUCKET = STORAGE_CONSTANTS.STORAGE_BUCKET;
const DIA_MS = STORAGE_CONSTANTS.MS_PER_DAY;

// Caché en memoria de Signed URLs para que abrir vistas previas repetidas sea instantáneo (50 min TTL)
const signedUrlCache = new Map();
const SIGNED_URL_TTL_MS = 50 * 60 * 1000;

/**
 * Adaptadores de compatibilidad delegados al Patrón Factory
 */
const mapCarpeta = (c) => FolderFactory.createFromDb(c);
const mapArchivo = (f) => FileFactory.createFromDb(f);

/**
 * Obtiene el ID del usuario activo (parámetro o sesión de Supabase)
 */
async function resolveUserId(userId) {
  if (userId) return userId;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

/**
 * Recalcula el espacio usado: archivos (incluye papelera) + versiones antiguas en paralelo
 */
async function recalcularAlmacenamiento(userId) {
  if (!userId) return;
  try {
    const [{ data: archivos }, { data: versiones }] = await Promise.all([
      supabase.from('archivo').select('tamano').eq('id_usuario', userId),
      supabase.from('archivo_version').select('tamano').eq('id_usuario', userId)
    ]);
    const totalBytes = [...(archivos || []), ...(versiones || [])]
      .reduce((acc, curr) => acc + parseInt(curr.tamano || 0, 10), 0);

    await supabase.from('almacenamiento').upsert({
      id_usuario: userId,
      espacio_usado_bytes: totalBytes,
      ultima_actualizacion: new Date().toISOString()
    }, { onConflict: 'id_usuario' });
  } catch (e) {
    console.warn('No se pudo actualizar espacio_usado_bytes:', e);
  }
}

// Código que devuelve la BD cuando un archivo no cabe en el plan (trigger validar_cuota)
const QUOTA_ERROR_CODE = 'NB010';

/**
 * Revisa antes de subir que el archivo quepa en el plan del dueño (RF-15), para no subir
 * el binario en balde. La BD lo vuelve a revisar al guardar; si no se puede consultar, se sigue.
 */
async function asegurarEspacio(ownerId, bytesNecesarios) {
  const { data: disponible, error } = await supabase.rpc('espacio_disponible', { p_usuario: ownerId });
  if (error) {
    console.warn('No se pudo consultar el espacio disponible:', error.message);
    return;
  }
  if (bytesNecesarios > disponible) {
    throw new Error(
      `No hay espacio suficiente: se necesitan ${formatBytes(bytesNecesarios)} y quedan ${formatBytes(Math.max(0, disponible))}. ` +
      'Libera espacio vaciando la papelera o cambia a un plan con más capacidad.'
    );
  }
}

// Si el registro no se pudo guardar, el binario ya subido no le sirve a nadie
async function quitarBinarioHuerfano(ruta) {
  const { error } = await supabase.storage.from(BUCKET).remove([ruta]);
  if (error) console.warn('No se pudo borrar el archivo subido sin registro:', error.message);
}

/**
 * Sube el binario a Storage dentro de la carpeta del dueño ({ownerId}/...).
 * El timestamp en la ruta evita sobrescribir versiones anteriores.
 * @returns {Promise<string>} ruta guardada en Storage
 */
async function subirBinario(ownerId, file) {
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${ownerId}/${Date.now()}_${cleanFileName}`;

  console.log(`Subiendo archivo a Supabase Storage (${BUCKET})... Ruta: ${storagePath}`);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error al subir a Supabase Storage:', error.message, error);
    throw new Error(`Falló la subida a Supabase Storage: ${error.message}`);
  }

  return data?.path || storagePath;
}

/**
 * La versión actual de un archivo pasa al historial de su dueño y el registro
 * apunta al contenido nuevo (cambios: ruta_storage, tamano y opcionalmente tipo)
 * @returns {Promise<Object>} registro actualizado de public.archivo
 */
async function reemplazarVersionActual(existente, cambios) {
  const { error: versionError } = await supabase.from('archivo_version').insert([{
    id_archivo: existente.id_archivo,
    id_usuario: existente.id_usuario,
    tamano: existente.tamano,
    ruta_storage: existente.ruta_storage,
    nombre: existente.nombre
  }]);

  if (versionError) {
    throw new Error(versionError.code === QUOTA_ERROR_CODE ? versionError.message : `No se pudo guardar la versión anterior: ${versionError.message}`);
  }

  const { data: updated, error: updateError } = await supabase
    .from('archivo')
    .update({ ...cambios, fecha_modificacion: new Date().toISOString() })
    .eq('id_archivo', existente.id_archivo)
    .select();

  if (updateError) {
    throw new Error(updateError.code === QUOTA_ERROR_CODE ? updateError.message : `No se pudo actualizar el archivo: ${updateError.message}`);
  }

  return updated?.[0];
}

/**
 * Días que un archivo permanece en la papelera según el plan.
 * Delega al Patrón Strategy (retentionStrategy).
 */
export function getRetentionDays(planName = '') {
  return calculateRetentionDays(planName);
}

/**
 * Devuelve los IDs de todas las subcarpetas (hijas, nietas, etc.) de una carpeta.
 * Recibe la lista de carpetas ya mapeadas (con parentId).
 */
export function getDescendantFolderIds(folders, folderId) {
  const ids = [];
  const pendientes = [folderId];

  while (pendientes.length > 0) {
    const actual = pendientes.pop();
    folders.forEach(f => {
      if (f.parentId === actual && f.id !== folderId && !ids.includes(f.id)) {
        ids.push(f.id);
        pendientes.push(f.id);
      }
    });
  }
  return ids;
}

// Error de Postgres cuando una columna no existe (la BD aún no tiene la sección 18 de schema.sql)
const COLUMNA_INEXISTENTE = '42703';

/**
 * Consulta carpetas sin las que están en la papelera. Si la BD todavía no tiene la columna
 * "eliminado" (falta correr la sección 18 de schema.sql), repite la consulta sin ese filtro.
 * construir(conFiltro) arma la consulta.
 */
async function consultarCarpetasActivas(construir) {
  const res = await construir(true);
  if (res.error?.code === COLUMNA_INEXISTENTE) return construir(false);
  return res;
}

// Partir una lista en grupos (para no armar URLs demasiado largas con .in())
const enGrupos = (lista, n = 100) => Array.from({ length: Math.ceil(lista.length / n) }, (_, i) => lista.slice(i * n, i * n + n));

/** Días que le quedan a algo en la papelera (null = sin límite) */
function diasRestantes(fechaEliminacion, retentionDays) {
  if (!retentionDays || !fechaEliminacion) return null;
  const expira = new Date(fechaEliminacion).getTime() + retentionDays * DIA_MS;
  return Math.max(0, Math.ceil((expira - Date.now()) / DIA_MS));
}

export const filesService = {
  /**
   * Obtener los archivos activos del usuario (sin los de la papelera)
   */
  /**
   * Obtener los archivos activos del usuario (sin los de la papelera)
   */
  async getUserFiles(userId) {
    let activeUserId = await resolveUserId(userId);

    if (!activeUserId) {
      try {
        const saved = localStorage.getItem('nimbox_current_user');
        if (saved) activeUserId = JSON.parse(saved).id;
      } catch (e) {}
    }

    if (!activeUserId) return [];

    try {
      const { data, error } = await supabase
        .from('archivo')
        .select('*')
        .eq('id_usuario', activeUserId)
        .eq('eliminado', false)
        .order('fecha_subida', { ascending: false });

      if (error) {
        console.error('Error al consultar tabla public.archivo:', error.message);
        return [];
      }

      return (data || []).map(mapArchivo);
    } catch (err) {
      console.error('Excepción al obtener archivos:', err);
      return [];
    }
  },

  /**
   * Obtener las carpetas del usuario según el nivel padre (null para raíz)
   */
  async getUserFolders(userId, parentFolderId = null) {
    const activeUserId = await resolveUserId(userId);
    if (!activeUserId) return [];

    try {
      const { data, error } = await consultarCarpetasActivas((conFiltro) => {
        let query = supabase.from('carpeta').select('*').eq('id_usuario', activeUserId);
        if (conFiltro) query = query.eq('eliminado', false);
        query = parentFolderId ? query.eq('id_carpeta_padre', parentFolderId) : query.is('id_carpeta_padre', null);
        return query.order('nombre', { ascending: true });
      });

      if (error) {
        console.error('Error al consultar tabla public.carpeta:', error.message);
        return [];
      }

      return (data || []).map(mapCarpeta);
    } catch (err) {
      console.error('Excepción al obtener carpetas:', err);
      return [];
    }
  },

  /**
   * Obtener absolutamente todas las carpetas del usuario (para selectores/módulos de mover)
   */
  async getAllUserFolders(userId) {
    const activeUserId = await resolveUserId(userId);
    if (!activeUserId) return [];

    try {
      const { data, error } = await consultarCarpetasActivas((conFiltro) => {
        let query = supabase.from('carpeta').select('*').eq('id_usuario', activeUserId);
        if (conFiltro) query = query.eq('eliminado', false);
        return query.order('nombre', { ascending: true });
      });

      if (error) return [];
      return (data || []).map(mapCarpeta);
    } catch (err) {
      return [];
    }
  },

  /**
   * Crear una nueva carpeta personalizada (con fallback si la columna color no existe en la BD)
   */
  async createFolder(userId, name, color = 'purple', parentFolderId = null) {
    const activeUserId = await resolveUserId(userId);
    if (!activeUserId) throw new Error('Debes iniciar sesión para crear carpetas.');

    const baseRecord = {
      id_usuario: activeUserId,
      id_carpeta_padre: parentFolderId || null,
      nombre: name.trim(),
      fecha_creacion: new Date().toISOString()
    };

    // 1. Intentar insertar con el campo 'color'
    let { data, error } = await supabase
      .from('carpeta')
      .insert([{ ...baseRecord, color: color || 'purple' }])
      .select();

    // 2. Si la columna 'color' no existe en la BD de Supabase, reintentar sin 'color'
    if (error && (error.message?.includes('color') || error.code === 'PGRST204')) {
      console.warn('La columna color no está creada en Supabase. Reintentando sin color...');
      const fallback = await supabase
        .from('carpeta')
        .insert([baseRecord])
        .select();

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('Error al crear carpeta:', error.message);
      throw new Error(`No se pudo crear la carpeta: ${error.message}`);
    }

    const createdRecord = data?.[0] || {};
    return mapCarpeta({
      ...createdRecord,
      color: createdRecord.color || color || 'purple'
    });
  },

  /**
   * Editar nombre o color de una carpeta (con fallback si color no existe)
   */
  async updateFolder(folderId, { name, color }) {
    const updates = {};
    if (name !== undefined) updates.nombre = name.trim();
    if (color !== undefined) updates.color = color;

    let { data, error } = await supabase
      .from('carpeta')
      .update(updates)
      .eq('id_carpeta', folderId)
      .select();

    if (error && (error.message?.includes('color') || error.code === 'PGRST204')) {
      delete updates.color;
      const fallback = await supabase
        .from('carpeta')
        .update(updates)
        .eq('id_carpeta', folderId)
        .select();

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('Error al actualizar carpeta:', error.message);
      throw new Error(`No se pudo actualizar la carpeta: ${error.message}`);
    }

    const updatedRecord = data?.[0] || {};
    return mapCarpeta({
      ...updatedRecord,
      color: updatedRecord.color || color || 'purple'
    });
  },

  /**
   * Mandar una carpeta a la papelera con sus subcarpetas y archivos (sección 18 de schema.sql).
   * Devuelve cuántos archivos se fueron con ella.
   */
  async deleteFolder(folderId) {
    const { data, error } = await supabase.rpc('enviar_carpeta_papelera', { p_carpeta: folderId });
    if (error) {
      if (error.code === 'PGRST202') {
        throw new Error('Falta actualizar la base de datos (sección 18 de schema.sql) para mandar carpetas a la papelera.');
      }
      throw new Error(`No se pudo mover la carpeta a la papelera: ${error.message}`);
    }
    return Number(data) || 0;
  },

  /**
   * Restaurar una carpeta de la papelera con su estructura y sus archivos
   */
  async restoreFolder(folderId) {
    const { data, error } = await supabase.rpc('restaurar_carpeta', { p_carpeta: folderId });
    if (error) throw new Error(`No se pudo restaurar la carpeta: ${error.message}`);
    return Number(data) || 0;
  },

  /**
   * Eliminar definitivamente una carpeta de la papelera: borra de Storage todos sus archivos
   * (y sus versiones) y luego la carpeta; las subcarpetas y registros se van por ON DELETE CASCADE.
   */
  async deleteFolderPermanently(userId, folderId) {
    const activeUserId = await resolveUserId(userId);
    const { data: todas, error: errCarpetas } = await supabase
      .from('carpeta').select('id_carpeta, id_carpeta_padre').eq('id_usuario', activeUserId);
    if (errCarpetas) throw new Error(`No se pudo eliminar la carpeta: ${errCarpetas.message}`);

    const ids = [folderId, ...getDescendantFolderIds((todas || []).map(c => ({ id: c.id_carpeta, parentId: c.id_carpeta_padre })), folderId)];

    const archivos = [];
    for (const grupo of enGrupos(ids)) {
      const { data } = await supabase.from('archivo').select('id_archivo, ruta_storage').in('id_carpeta', grupo);
      archivos.push(...(data || []));
    }
    const rutas = archivos.map(a => a.ruta_storage);
    for (const grupo of enGrupos(archivos.map(a => a.id_archivo))) {
      const { data } = await supabase.from('archivo_version').select('ruta_storage').in('id_archivo', grupo);
      rutas.push(...(data || []).map(v => v.ruta_storage));
    }
    for (const grupo of enGrupos(rutas.filter(Boolean))) {
      const { error: stErr } = await supabase.storage.from(BUCKET).remove(grupo);
      if (stErr) console.error('Error al eliminar de Storage:', stErr.message);
    }

    const { error } = await supabase.from('carpeta').delete().eq('id_carpeta', folderId);
    if (error) throw new Error(`No se pudo eliminar la carpeta definitivamente: ${error.message}`);

    await recalcularAlmacenamiento(activeUserId);
    return archivos.length;
  },

  /**
   * Mover un archivo a una carpeta específica (o raíz si folderId es null)
   */
  async moveFileToFolder(fileId, folderId) {
    const { data, error } = await supabase
      .from('archivo')
      .update({ id_carpeta: folderId || null })
      .eq('id_archivo', fileId)
      .select();

    if (error) {
      console.error('Error al mover archivo a la carpeta:', error.message);
      throw new Error(`No se pudo mover el archivo: ${error.message}`);
    }

    return mapArchivo(data[0]);
  },

  /**
   * Mover una carpeta a otra carpeta (o raíz si targetParentId es null)
   */
  async moveFolderToFolder(folderId, targetParentId, knownFolders = null) {
    if (folderId === targetParentId) {
      throw new Error('No puedes mover una carpeta dentro de sí misma.');
    }

    // Evitar ciclos: si ya tenemos la lista de carpetas en memoria, validamos en 0ms sin múltiples queries
    if (Array.isArray(knownFolders) && knownFolders.length > 0) {
      const parentMap = new Map(knownFolders.map(f => [f.id, f.parentId || null]));
      let currentId = targetParentId;
      const visitados = new Set();
      while (currentId && !visitados.has(currentId)) {
        if (currentId === folderId) {
          throw new Error('No puedes mover una carpeta dentro de una de sus subcarpetas.');
        }
        visitados.add(currentId);
        currentId = parentMap.get(currentId) || null;
      }
    } else {
      let currentId = targetParentId;
      const visitados = new Set();
      while (currentId && !visitados.has(currentId)) {
        if (currentId === folderId) {
          throw new Error('No puedes mover una carpeta dentro de una de sus subcarpetas.');
        }
        visitados.add(currentId);
        const { data: padre } = await supabase
          .from('carpeta')
          .select('id_carpeta_padre')
          .eq('id_carpeta', currentId)
          .maybeSingle();
        currentId = padre?.id_carpeta_padre || null;
      }
    }

    const { data, error } = await supabase
      .from('carpeta')
      .update({ id_carpeta_padre: targetParentId || null })
      .eq('id_carpeta', folderId)
      .select();

    if (error) {
      console.error('Error al mover la carpeta:', error.message);
      throw new Error(`No se pudo mover la carpeta: ${error.message}`);
    }

    return mapCarpeta(data[0]);
  },

  /**
   * Obtener la ruta de carpetas (Breadcrumbs) desde la raíz hasta la carpeta actual
   */
  async getFolderPath(folderId) {
    if (!folderId) return [];
    const path = [];
    const visitados = new Set();
    let currentId = folderId;

    // "visitados" evita un ciclo infinito si alguna carpeta quedó dentro de su propia subcarpeta
    while (currentId && !visitados.has(currentId)) {
      visitados.add(currentId);

      const { data, error } = await supabase
        .from('carpeta')
        .select('id_carpeta, nombre, id_carpeta_padre')
        .eq('id_carpeta', currentId)
        .maybeSingle();

      if (error || !data) break;
      path.unshift({ id: data.id_carpeta, name: data.nombre });
      currentId = data.id_carpeta_padre;
    }

    return path;
  },

  /**
   * Subir archivo al bucket `nimbox-files` e insertarlo en public.archivo.
   * Si ya existe un archivo con el mismo nombre en el mismo lugar, el anterior pasa al historial de versiones.
   * userId es el dueño del espacio: quien edita una carpeta compartida pasa el id del dueño.
   */
  async uploadFile(userId, file, currentFolderId = null) {
    const activeUserId = await resolveUserId(userId);

    if (!activeUserId) {
      throw new Error('Debes iniciar sesión para subir archivos a la nube.');
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(activeUserId)) {
      throw new Error('El ID de usuario no es un UUID de Supabase válido. Asegúrate de registrarte o iniciar sesión correctamente.');
    }

    const { type } = detectCategoryAndType(file.name);

    // 1 y 2 en paralelo: buscar versión previa con el mismo nombre y consultar espacio disponible
    let busqueda = supabase
      .from('archivo')
      .select('*')
      .eq('id_usuario', activeUserId)
      .eq('nombre', file.name)
      .eq('eliminado', false);

    busqueda = currentFolderId
      ? busqueda.eq('id_carpeta', currentFolderId)
      : busqueda.is('id_carpeta', null);

    const [{ data: coincidencias }, { data: disponible, error: rpcError }] = await Promise.all([
      busqueda.order('fecha_modificacion', { ascending: false }).limit(1),
      supabase.rpc('espacio_disponible', { p_usuario: activeUserId })
    ]);

    const existente = coincidencias?.[0] || null;
    const bytesNecesarios = Math.max(file.size, Number(existente?.tamano || 0));

    if (!rpcError && typeof disponible === 'number' && bytesNecesarios > disponible) {
      throw new Error(
        `No hay espacio suficiente: se necesitan ${formatBytes(bytesNecesarios)} y quedan ${formatBytes(Math.max(0, disponible))}. ` +
        'Libera espacio vaciando la papelera o cambia a un plan con más capacidad.'
      );
    }

    // 3. Subir binario a Supabase Storage
    const uploadedPath = await subirBinario(activeUserId, file);
    const ahora = new Date().toISOString();

    let savedRecord = null;
    let isNewVersion = false;

    try {
      if (existente) {
        // 4a. La versión actual pasa al historial y el registro apunta al archivo nuevo
        savedRecord = await reemplazarVersionActual(existente, {
          ruta_storage: uploadedPath,
          tamano: file.size,
          tipo: type
        });
        isNewVersion = true;
      } else {
        // 4b. Archivo nuevo: insertar registro en public.archivo
        const { data: dbData, error: dbError } = await supabase
          .from('archivo')
          .insert([{
            id_usuario: activeUserId,
            id_carpeta: currentFolderId || null,
            nombre: file.name,
            tipo: type,
            tamano: file.size,
            ruta_storage: uploadedPath,
            fecha_subida: ahora,
            fecha_modificacion: ahora
          }])
          .select();

        if (dbError) {
          console.error('Error al insertar registro en public.archivo:', dbError.message, dbError);
          throw new Error(dbError.code === QUOTA_ERROR_CODE ? dbError.message : `Guardado en base de datos falló: ${dbError.message}`);
        }

        savedRecord = dbData?.[0];
      }
    } catch (err) {
      await quitarBinarioHuerfano(uploadedPath);
      throw err;
    }

    // 5. Actualizar espacio usado en segundo plano para no bloquear la respuesta al usuario
    recalcularAlmacenamiento(activeUserId).catch(() => {});

    return {
      ...mapArchivo(savedRecord),
      updated: 'Ahora mismo',
      isNewVersion
    };
  },

  /**
   * Reemplazar el contenido de un archivo existente (lo usa quien edita por un enlace).
   * Conserva nombre y carpeta; la versión anterior pasa al historial del dueño.
   * @param {Object} file archivo ya mapeado (id, file_path, size_bytes)
   * @param {File} newFile
   * @param {string} ownerId dueño del archivo: el binario se guarda en su carpeta de Storage
   */
  async uploadNewVersion(file, newFile, ownerId) {
    await asegurarEspacio(ownerId, Math.max(newFile.size, file.size_bytes || 0));
    const uploadedPath = await subirBinario(ownerId, newFile);
    try {
      const updated = await reemplazarVersionActual(
        { id_archivo: file.id, id_usuario: ownerId, tamano: file.size_bytes, ruta_storage: file.file_path, nombre: file.name },
        { ruta_storage: uploadedPath, tamano: newFile.size }
      );
      return mapArchivo(updated);
    } catch (err) {
      await quitarBinarioHuerfano(uploadedPath);
      throw err;
    }
  },

  /**
   * Cambiar el nombre de un archivo (el dueño o quien lo edita por un enlace).
   * No permite repetir el nombre de otro archivo en la misma carpeta, porque al subir
   * un archivo con el mismo nombre se guarda como versión nueva del existente.
   * @param {Object} file archivo ya mapeado (id, folder_id, owner_id)
   * @param {string} newName
   */
  async renameFile(file, newName) {
    const nombre = (newName || '').trim();
    if (!nombre) throw new Error('El nombre no puede quedar vacío.');

    let repetido = supabase
      .from('archivo')
      .select('id_archivo')
      .eq('id_usuario', file.owner_id)
      .eq('nombre', nombre)
      .eq('eliminado', false)
      .neq('id_archivo', file.id);
    repetido = file.folder_id ? repetido.eq('id_carpeta', file.folder_id) : repetido.is('id_carpeta', null);

    const { data: coincidencias } = await repetido.limit(1);
    if (coincidencias?.length) {
      throw new Error(`Ya hay un archivo llamado "${nombre}" en esta carpeta.`);
    }

    const { data, error } = await supabase
      .from('archivo')
      .update({ nombre })
      .eq('id_archivo', file.id)
      .select();

    if (error) throw new Error(`No se pudo cambiar el nombre: ${error.message}`);
    return mapArchivo(data[0]);
  },

  /**
   * Obtener URL de vista previa rápida con caché de Signed URLs en memoria
   */
  async getFilePreviewUrl(filePath) {
    if (!filePath) return null;

    try {
      // 1. Revisar caché en memoria (respuesta instantánea en 0ms)
      const cached = signedUrlCache.get(filePath);
      if (cached && cached.expiresAt > Date.now()) {
        return {
          url: cached.url,
          isBlob: false
        };
      }

      // 2. Generar Signed URL ligera (permite streaming inmediato de imágenes, PDF, audio y video)
      const { data: signedData, error: signedErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath, 3600);

      if (!signedErr && signedData?.signedUrl) {
        signedUrlCache.set(filePath, {
          url: signedData.signedUrl,
          expiresAt: Date.now() + SIGNED_URL_TTL_MS
        });
        return {
          url: signedData.signedUrl,
          isBlob: false
        };
      }

      // 3. Fallback: descargar como Blob si la Signed URL no estuvo disponible
      const { data: blobData, error: dlErr } = await supabase.storage
        .from(BUCKET)
        .download(filePath);

      if (!dlErr && blobData) {
        return {
          url: URL.createObjectURL(blobData),
          blob: blobData,
          isBlob: true
        };
      }

      // 4. Fallback a Public URL
      const { data: publicData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      if (publicData?.publicUrl) {
        return {
          url: publicData.publicUrl,
          isBlob: false
        };
      }
    } catch (err) {
      console.warn('No se pudo obtener URL de vista previa:', err);
    }
    return null;
  },

  /**
   * Descargar archivo real desde Supabase Storage (sirve también para versiones antiguas)
   */
  async downloadFile(filePath, fileName) {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(filePath);

      if (error || !data) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600);
        const url = signed?.signedUrl || supabase.storage.from(BUCKET).getPublicUrl(filePath).data?.publicUrl;
        if (url) {
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName || 'archivo';
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return true;
        }
        throw error || new Error('No se pudo descargar el archivo.');
      }

      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName || 'archivo';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return true;
    } catch (err) {
      console.error('Error al descargar archivo:', err);
      throw err;
    }
  },

  // ===========================================================================
  // PAPELERA
  // ===========================================================================

  /**
   * Mover archivo a la papelera (borrado lógico: no se elimina de Storage)
   */
  async moveToTrash(fileId) {
    const { error } = await supabase
      .from('archivo')
      .update({ eliminado: true, fecha_eliminacion: new Date().toISOString() })
      .eq('id_archivo', fileId);

    if (error) {
      console.error('Error al mover a la papelera:', error.message);
      throw new Error(`No se pudo mover a la papelera: ${error.message}`);
    }
    return true;
  },

  /**
   * Compatibilidad con el Dashboard actual: "eliminar" ahora manda a la papelera
   */
  async deleteFile(userId, fileId, filePath) {
    return this.moveToTrash(fileId);
  },

  /**
   * Contenido de la papelera: carpetas (con lo que tienen dentro) y archivos sueltos,
   * con los días que les quedan. Cada elemento trae kind: 'folder' | 'file'.
   * Los archivos que están dentro de una carpeta eliminada no se listan aparte: se
   * restauran o se borran junto con ella.
   */
  async getTrashItems(userId, retentionDays = 30) {
    const activeUserId = await resolveUserId(userId);
    if (!activeUserId) return [];

    const [{ data, error }, { data: carpetas, error: errCarpetas }] = await Promise.all([
      supabase.from('archivo').select('*').eq('id_usuario', activeUserId).eq('eliminado', true)
        .order('fecha_eliminacion', { ascending: false }),
      supabase.from('carpeta').select('id_carpeta, id_carpeta_padre, nombre, color, eliminado, fecha_eliminacion').eq('id_usuario', activeUserId),
    ]);

    if (error) {
      console.error('Error al consultar la papelera:', error.message);
      return [];
    }

    // Sin la sección 18 en la BD no hay carpetas en la papelera
    const todas = errCarpetas ? [] : (carpetas || []);
    const eliminadas = new Map(todas.filter(c => c.eliminado).map(c => [c.id_carpeta, c]));
    const mapeadas = todas.map(c => ({ id: c.id_carpeta, parentId: c.id_carpeta_padre }));

    const archivosBorrados = data || [];
    const items = [];

    for (const c of eliminadas.values()) {
      // Solo la carpeta de más arriba: sus subcarpetas van dentro de ella
      if (c.id_carpeta_padre && eliminadas.has(c.id_carpeta_padre)) continue;
      const subarbol = new Set([c.id_carpeta, ...getDescendantFolderIds(mapeadas, c.id_carpeta)]);
      const dentro = archivosBorrados.filter(f => subarbol.has(f.id_carpeta));
      const bytes = dentro.reduce((acc, f) => acc + parseInt(f.tamano || 0, 10), 0);
      items.push({
        kind: 'folder',
        id: c.id_carpeta,
        name: c.nombre,
        color: c.color || 'purple',
        filesCount: dentro.length,
        subfoldersCount: subarbol.size - 1,
        size_bytes: bytes,
        size: formatBytes(bytes),
        deletedAt: c.fecha_eliminacion,
        deleted: c.fecha_eliminacion ? formatDate(c.fecha_eliminacion) : '',
        daysLeft: diasRestantes(c.fecha_eliminacion, retentionDays),
      });
    }

    for (const f of archivosBorrados) {
      if (f.id_carpeta && eliminadas.has(f.id_carpeta)) continue;
      items.push({
        ...mapArchivo(f),
        kind: 'file',
        deletedAt: f.fecha_eliminacion,
        deleted: f.fecha_eliminacion ? formatDate(f.fecha_eliminacion) : '',
        daysLeft: diasRestantes(f.fecha_eliminacion, retentionDays),
      });
    }

    return items.sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));
  },

  /** Compatibilidad: solo los archivos sueltos de la papelera */
  async getTrashFiles(userId, retentionDays = 30) {
    return (await this.getTrashItems(userId, retentionDays)).filter(i => i.kind === 'file');
  },

  /**
   * Restaurar archivo desde la papelera
   */
  async restoreFromTrash(fileId) {
    const { error } = await supabase
      .from('archivo')
      .update({ eliminado: false, fecha_eliminacion: null })
      .eq('id_archivo', fileId);

    if (error) {
      console.error('Error al restaurar archivo:', error.message);
      throw new Error(`No se pudo restaurar: ${error.message}`);
    }
    return true;
  },

  /**
   * Eliminar definitivamente: borra de Storage (archivo + versiones) y de la BD
   */
  async deletePermanently(userId, fileId, filePath) {
    const activeUserId = await resolveUserId(userId);

    // 1. Rutas de todas las versiones antiguas
    const { data: versiones } = await supabase
      .from('archivo_version')
      .select('ruta_storage')
      .eq('id_archivo', fileId);

    const rutas = [filePath, ...(versiones || []).map(v => v.ruta_storage)].filter(Boolean);

    // 2. Eliminar binarios de Storage
    if (rutas.length > 0) {
      const { error: stErr } = await supabase.storage.from(BUCKET).remove(rutas);
      if (stErr) console.error('Error al eliminar de Storage:', stErr.message);
    }

    // 3. Eliminar registro (las versiones se borran por ON DELETE CASCADE)
    const { error } = await supabase.from('archivo').delete().eq('id_archivo', fileId);
    if (error) {
      console.error('Error al eliminar de public.archivo:', error.message);
      throw new Error(`No se pudo eliminar definitivamente: ${error.message}`);
    }

    // 4. Recalcular almacenamiento usado
    await recalcularAlmacenamiento(activeUserId);
    return true;
  },

  /**
   * Eliminar definitivamente los archivos que superaron los días de retención
   */
  async purgeExpiredTrash(userId, retentionDays) {
    if (!retentionDays) return 0; // retención ilimitada

    const activeUserId = await resolveUserId(userId);
    if (!activeUserId) return 0;

    const limite = new Date(Date.now() - retentionDays * DIA_MS).toISOString();

    // 1. Carpetas vencidas (con todo lo que tienen dentro). Solo las de más arriba:
    //    las subcarpetas se van con ellas.
    let carpetasPurgadas = 0;
    const { data: vencidas, error: errCarpetas } = await supabase
      .from('carpeta')
      .select('id_carpeta, id_carpeta_padre')
      .eq('id_usuario', activeUserId)
      .eq('eliminado', true)
      .lt('fecha_eliminacion', limite);
    if (!errCarpetas && vencidas) {
      const idsVencidas = new Set(vencidas.map(c => c.id_carpeta));
      for (const c of vencidas.filter(c => !idsVencidas.has(c.id_carpeta_padre))) {
        try {
          await this.deleteFolderPermanently(activeUserId, c.id_carpeta);
          carpetasPurgadas += 1;
        } catch (e) {
          console.warn('No se pudo purgar carpeta:', c.id_carpeta, e);
        }
      }
    }

    // 2. Archivos vencidos
    const { data, error } = await supabase
      .from('archivo')
      .select('id_archivo, ruta_storage')
      .eq('id_usuario', activeUserId)
      .eq('eliminado', true)
      .lt('fecha_eliminacion', limite);

    if (error || !data) return carpetasPurgadas;

    for (const f of data) {
      try {
        await this.deletePermanently(activeUserId, f.id_archivo, f.ruta_storage);
      } catch (e) {
        console.warn('No se pudo purgar archivo:', f.id_archivo, e);
      }
    }
    return carpetasPurgadas + data.length;
  },

  // ===========================================================================
  // HISTORIAL DE VERSIONES
  // ===========================================================================

  /**
   * Obtener versiones antiguas de un archivo (de la más reciente a la más vieja)
   */
  async getVersions(fileId) {
    const { data, error } = await supabase
      .from('archivo_version')
      .select('*')
      .eq('id_archivo', fileId)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error al consultar versiones:', error.message);
      return [];
    }

    return (data || []).map(v => ({
      id: v.id_version,
      name: v.nombre || null,
      size_bytes: parseInt(v.tamano || 0, 10),
      size: formatBytes(parseInt(v.tamano || 0, 10)),
      date: formatDate(v.fecha_creacion),
      file_path: v.ruta_storage
    }));
  },

  /**
   * Restaurar una versión antigua: la actual pasa al historial y la elegida pasa a ser la actual,
   * con el nombre que tenía en esa versión (si se guardó).
   * Devuelve el archivo actualizado para refrescar la lista del Dashboard.
   */
  async restoreVersion(userId, file, version) {
    const activeUserId = await resolveUserId(userId);

    // 1. Guardar la versión actual en el historial
    const { error: insertError } = await supabase.from('archivo_version').insert([{
      id_archivo: file.id,
      id_usuario: activeUserId,
      tamano: file.size_bytes,
      ruta_storage: file.file_path,
      nombre: file.name
    }]);

    if (insertError) {
      throw new Error(`No se pudo guardar la versión actual: ${insertError.message}`);
    }

    // 2. La versión elegida pasa a ser la actual
    const { data: updated, error: updateError } = await supabase
      .from('archivo')
      .update({
        ruta_storage: version.file_path,
        tamano: version.size_bytes,
        nombre: version.name || file.name,
        fecha_modificacion: new Date().toISOString()
      })
      .eq('id_archivo', file.id)
      .select();

    if (updateError) {
      throw new Error(`No se pudo restaurar la versión: ${updateError.message}`);
    }

    // 3. Quitarla del historial (ya es la actual)
    await supabase.from('archivo_version').delete().eq('id_version', version.id);

    return mapArchivo(updated[0]);
  }
};

export default filesService;