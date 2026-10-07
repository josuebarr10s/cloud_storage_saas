import supabase from '../lib/supabase.js';

const BUCKET = 'nimbox-files';
const DIA_MS = 24 * 60 * 60 * 1000;

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDate(fecha) {
  return new Date(fecha).toLocaleDateString('es-ES', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function detectCategoryAndType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'bmp', 'ico'].includes(ext)) {
    return { type: 'image', category: 'images', mimeCategory: 'image', ext };
  }
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'].includes(ext)) {
    return { type: 'video', category: 'media', mimeCategory: 'video', ext };
  }
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext)) {
    return { type: 'audio', category: 'media', mimeCategory: 'audio', ext };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { type: 'zip', category: 'docs', mimeCategory: 'archive', ext };
  }
  if (['pdf'].includes(ext)) {
    return { type: 'pdf', category: 'docs', mimeCategory: 'pdf', ext };
  }
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'txt', 'md', 'csv', 'sql', 'py', 'java', 'c', 'cpp', 'xml', 'yaml', 'yml'].includes(ext)) {
    return { type: 'code', category: 'docs', mimeCategory: 'text', ext };
  }
  return { type: 'doc', category: 'docs', mimeCategory: 'other', ext };
}

/**
 * Convierte una fila de public.carpeta al formato que usa la UI
 */
function mapCarpeta(c) {
  return {
    id: c.id_carpeta,
    name: c.nombre,
    color: c.color || 'purple',
    parentId: c.id_carpeta_padre || null,
    updated: formatDate(c.fecha_creacion),
    created_at: c.fecha_creacion,
    isFolder: true
  };
}

/**
 * Convierte una fila de public.archivo al formato que usa el Dashboard
 */
function mapArchivo(f) {
  const { category, type, ext, mimeCategory } = detectCategoryAndType(f.nombre);
  const bytes = parseInt(f.tamano || 0, 10);
  return {
    id: f.id_archivo,
    name: f.nombre,
    type: f.tipo || type,
    mimeCategory: mimeCategory,
    ext: ext,
    size_bytes: bytes,
    size: formatBytes(bytes),
    updated: formatDate(f.fecha_modificacion || f.fecha_subida),
    updated_at: f.fecha_modificacion || f.fecha_subida,
    category: category,
    shared: false,
    file_path: f.ruta_storage,
    folder_id: f.id_carpeta || null,
    deleted_at: f.fecha_eliminacion || null,
    isFolder: false
  };
}

/**
 * Obtiene el ID del usuario activo (parámetro o sesión de Supabase)
 */
async function resolveUserId(userId) {
  if (userId) return userId;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

/**
 * Recalcula el espacio usado: archivos (incluye papelera) + versiones antiguas
 */
async function recalcularAlmacenamiento(userId) {
  if (!userId) return;
  try {
    const { data: archivos } = await supabase.from('archivo').select('tamano').eq('id_usuario', userId);
    const { data: versiones } = await supabase.from('archivo_version').select('tamano').eq('id_usuario', userId);
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

/**
 * Días que un archivo permanece en la papelera según el plan.
 * Devuelve null cuando la retención es ilimitada.
 */
export function getRetentionDays(planName = '') {
  const p = planName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (p.includes('basico')) return 7;
  if (p.includes('empresa')) return null;
  return 30;
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
      let query = supabase.from('carpeta').select('*').eq('id_usuario', activeUserId);
      if (parentFolderId) {
        query = query.eq('id_carpeta_padre', parentFolderId);
      } else {
        query = query.is('id_carpeta_padre', null);
      }

      const { data, error } = await query.order('nombre', { ascending: true });

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
      const { data, error } = await supabase
        .from('carpeta')
        .select('*')
        .eq('id_usuario', activeUserId)
        .order('nombre', { ascending: true });

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
   * Eliminar una carpeta (y sus subcarpetas/archivos contenidos)
   */
  async deleteFolder(folderId) {
    const { error } = await supabase
      .from('carpeta')
      .delete()
      .eq('id_carpeta', folderId);

    if (error) {
      console.error('Error al eliminar carpeta:', error.message);
      throw new Error(`No se pudo eliminar la carpeta: ${error.message}`);
    }
    return true;
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
  async moveFolderToFolder(folderId, targetParentId) {
    if (folderId === targetParentId) {
      throw new Error('No puedes mover una carpeta dentro de sí misma.');
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
    let currentId = folderId;

    while (currentId) {
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

    // 1. Asegurar que existe registro del usuario en la tabla public.usuario para evitar error de FK
    try {
      const { data: dbUser } = await supabase.from('usuario').select('id_usuario').eq('id_usuario', activeUserId).single();
      if (!dbUser) {
        const { data: { user } } = await supabase.auth.getUser();
        const email = user?.email || 'usuario@nimbox.com';
        const nameParts = (user?.user_metadata?.full_name || email.split('@')[0]).split(' ');
        await supabase.from('usuario').upsert({
          id_usuario: activeUserId,
          id_rol: 2,
          nombre: nameParts[0] || 'Usuario',
          apellido: nameParts.slice(1).join(' ') || '',
          estado: 'activo'
        });
      }
    } catch (e) {}

    const { type } = detectCategoryAndType(file.name);
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${activeUserId}/${timestamp}_${cleanFileName}`;

    let uploadedPath = storagePath;

    // 2. Subir binario a Supabase Storage (el timestamp en la ruta evita sobrescribir versiones anteriores)
    console.log(`Subiendo archivo a Supabase Storage (${BUCKET})... Ruta: ${storagePath}`);
    const { data: storageData, error: storageError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (storageError) {
      console.error('Error al subir a Supabase Storage:', storageError.message, storageError);
      throw new Error(`Falló la subida a Supabase Storage: ${storageError.message}`);
    }

    if (storageData?.path) {
      uploadedPath = storageData.path;
    }

    const ahora = new Date().toISOString();

    // 3. ¿Ya existe un archivo activo con el mismo nombre? -> nueva versión
    const { data: existente } = await supabase
      .from('archivo')
      .select('*')
      .eq('id_usuario', activeUserId)
      .eq('nombre', file.name)
      .eq('eliminado', false)
      .maybeSingle();

    let savedRecord = null;
    let isNewVersion = false;

    if (existente) {
      // 3a. La versión actual pasa al historial
      const { error: versionError } = await supabase.from('archivo_version').insert([{
        id_archivo: existente.id_archivo,
        id_usuario: activeUserId,
        tamano: existente.tamano,
        ruta_storage: existente.ruta_storage
      }]);

      if (versionError) {
        throw new Error(`No se pudo guardar la versión anterior: ${versionError.message}`);
      }

      // 3b. El registro principal apunta al archivo nuevo
      const { data: updated, error: updateError } = await supabase
        .from('archivo')
        .update({
          ruta_storage: uploadedPath,
          tamano: file.size,
          tipo: type,
          fecha_modificacion: ahora,
          id_carpeta: currentFolderId || existente.id_carpeta || null
        })
        .eq('id_archivo', existente.id_archivo)
        .select();

      if (updateError) {
        throw new Error(`No se pudo actualizar el archivo: ${updateError.message}`);
      }

      savedRecord = updated?.[0];
      isNewVersion = true;
    } else {
      // 3c. Archivo nuevo: insertar registro en public.archivo
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
        throw new Error(`Guardado en base de datos falló: ${dbError.message}`);
      }

      savedRecord = dbData?.[0];
    }

    // 4. Actualizar espacio usado
    await recalcularAlmacenamiento(activeUserId);

    return {
      ...mapArchivo(savedRecord),
      updated: 'Ahora mismo',
      isNewVersion
    };
  },

  /**
   * Obtener URL de vista previa o Blob para un archivo
   */
  async getFilePreviewUrl(filePath) {
    if (!filePath) return null;

    try {
      // 1. Intentar descargar directamente como Blob (funciona con sesión activa)
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

      // 2. Intentar crear Signed URL con 1 hora de validez
      const { data: signedData, error: signedErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath, 3600);

      if (!signedErr && signedData?.signedUrl) {
        return {
          url: signedData.signedUrl,
          isBlob: false
        };
      }

      // 3. Fallback a Public URL
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
   * Obtener archivos en la papelera con los días que les quedan
   */
  async getTrashFiles(userId, retentionDays = 30) {
    const activeUserId = await resolveUserId(userId);
    if (!activeUserId) return [];

    const { data, error } = await supabase
      .from('archivo')
      .select('*')
      .eq('id_usuario', activeUserId)
      .eq('eliminado', true)
      .order('fecha_eliminacion', { ascending: false });

    if (error) {
      console.error('Error al consultar la papelera:', error.message);
      return [];
    }

    return (data || []).map(f => {
      const archivo = mapArchivo(f);
      let daysLeft = null;
      if (retentionDays && f.fecha_eliminacion) {
        const expira = new Date(f.fecha_eliminacion).getTime() + retentionDays * DIA_MS;
        daysLeft = Math.max(0, Math.ceil((expira - Date.now()) / DIA_MS));
      }
      return {
        ...archivo,
        deleted: f.fecha_eliminacion ? formatDate(f.fecha_eliminacion) : '',
        daysLeft
      };
    });
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

    const { data, error } = await supabase
      .from('archivo')
      .select('id_archivo, ruta_storage')
      .eq('id_usuario', activeUserId)
      .eq('eliminado', true)
      .lt('fecha_eliminacion', limite);

    if (error || !data) return 0;

    for (const f of data) {
      try {
        await this.deletePermanently(activeUserId, f.id_archivo, f.ruta_storage);
      } catch (e) {
        console.warn('No se pudo purgar archivo:', f.id_archivo, e);
      }
    }
    return data.length;
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
      size_bytes: parseInt(v.tamano || 0, 10),
      size: formatBytes(parseInt(v.tamano || 0, 10)),
      date: formatDate(v.fecha_creacion),
      file_path: v.ruta_storage
    }));
  },

  /**
   * Restaurar una versión antigua: la actual pasa al historial y la elegida pasa a ser la actual.
   * Devuelve el archivo actualizado para refrescar la lista del Dashboard.
   */
  async restoreVersion(userId, file, version) {
    const activeUserId = await resolveUserId(userId);

    // 1. Guardar la versión actual en el historial
    const { error: insertError } = await supabase.from('archivo_version').insert([{
      id_archivo: file.id,
      id_usuario: activeUserId,
      tamano: file.size_bytes,
      ruta_storage: file.file_path
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
  },

  async toggleShareFile(fileId, currentSharedState) {
    return true;
  }
};

export default filesService;