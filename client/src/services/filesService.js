import supabase from '../lib/supabase.js';

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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

export const filesService = {
  /**
   * Obtener todos los archivos del usuario desde la tabla public.archivo
   */
  async getUserFiles(userId) {
    let activeUserId = userId;

    if (!activeUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      activeUserId = session?.user?.id;
    }

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
        .order('fecha_subida', { ascending: false });

      if (error) {
        console.error('Error al consultar tabla public.archivo:', error.message);
        return [];
      }

      return (data || []).map(f => {
        const { category, type, ext, mimeCategory } = detectCategoryAndType(f.nombre);
        return {
          id: f.id_archivo,
          name: f.nombre,
          type: f.tipo || type,
          mimeCategory: mimeCategory,
          ext: ext,
          size_bytes: parseInt(f.tamano || 0, 10),
          size: formatBytes(parseInt(f.tamano || 0, 10)),
          updated: new Date(f.fecha_subida || f.fecha_modificacion).toLocaleDateString('es-ES', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          }),
          category: category,
          shared: false,
          file_path: f.ruta_storage
        };
      });
    } catch (err) {
      console.error('Excepción al obtener archivos:', err);
      return [];
    }
  },

  /**
   * Subir archivo al bucket `nimbox-files` en Supabase Storage e insertar en la tabla public.archivo
   */
  async uploadFile(userId, file) {
    let activeUserId = userId;

    if (!activeUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      activeUserId = session?.user?.id;
    }

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

    const { type, category, ext, mimeCategory } = detectCategoryAndType(file.name);
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${activeUserId}/${timestamp}_${cleanFileName}`;

    let uploadedPath = storagePath;

    // 2. Subir binario a Supabase Storage (bucket nimbox-files)
    console.log(`Subiendo archivo a Supabase Storage (nimbox-files)... Ruta: ${storagePath}`);
    const { data: storageData, error: storageError } = await supabase.storage
      .from('nimbox-files')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (storageError) {
      console.error('Error al subir a Supabase Storage:', storageError.message, storageError);
      throw new Error(`Falló la subida a Supabase Storage: ${storageError.message}`);
    }

    if (storageData?.path) {
      uploadedPath = storageData.path;
      console.log('Archivo subido con éxito a Storage:', uploadedPath);
    }

    // 3. Insertar registro en la tabla public.archivo
    const newArchivo = {
      id_usuario: activeUserId,
      id_carpeta: null,
      nombre: file.name,
      tipo: type,
      tamano: file.size,
      ruta_storage: uploadedPath,
      fecha_subida: new Date().toISOString(),
      fecha_modificacion: new Date().toISOString()
    };

    console.log('Guardando metadatos en tabla public.archivo:', newArchivo);
    const { data: dbData, error: dbError } = await supabase
      .from('archivo')
      .insert([newArchivo])
      .select();

    if (dbError) {
      console.error('Error al insertar registro en public.archivo:', dbError.message, dbError);
      throw new Error(`Guardado en base de datos falló: ${dbError.message}`);
    }

    const savedRecord = dbData?.[0];

    // 4. Actualizar espacio usado en la tabla public.almacenamiento
    try {
      const { data: userFiles } = await supabase.from('archivo').select('tamano').eq('id_usuario', activeUserId);
      const totalBytes = (userFiles || []).reduce((acc, curr) => acc + parseInt(curr.tamano || 0, 10), 0);

      await supabase.from('almacenamiento').upsert({
        id_usuario: activeUserId,
        espacio_usado_bytes: totalBytes,
        ultima_actualizacion: new Date().toISOString()
      }, { onConflict: 'id_usuario' });
    } catch (e) {
      console.warn('No se pudo actualizar espacio_usado_bytes:', e);
    }

    return {
      id: savedRecord?.id_archivo || `f-${timestamp}`,
      name: file.name,
      type: type,
      mimeCategory: mimeCategory,
      ext: ext,
      size_bytes: file.size,
      size: formatBytes(file.size),
      updated: 'Ahora mismo',
      category: category,
      shared: false,
      file_path: uploadedPath
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
        .from('nimbox-files')
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
        .from('nimbox-files')
        .createSignedUrl(filePath, 3600);

      if (!signedErr && signedData?.signedUrl) {
        return {
          url: signedData.signedUrl,
          isBlob: false
        };
      }

      // 3. Fallback a Public URL
      const { data: publicData } = supabase.storage
        .from('nimbox-files')
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
   * Descargar archivo real desde Supabase Storage
   */
  async downloadFile(filePath, fileName) {
    try {
      const { data, error } = await supabase.storage
        .from('nimbox-files')
        .download(filePath);

      if (error || !data) {
        const { data: signed } = await supabase.storage.from('nimbox-files').createSignedUrl(filePath, 3600);
        const url = signed?.signedUrl || supabase.storage.from('nimbox-files').getPublicUrl(filePath).data?.publicUrl;
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

  /**
   * Eliminar archivo de public.archivo y del bucket nimbox-files
   */
  async deleteFile(userId, fileId, filePath) {
    let activeUserId = userId;

    if (!activeUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      activeUserId = session?.user?.id;
    }

    // 1. Eliminar registro en la tabla public.archivo
    try {
      const { error } = await supabase.from('archivo').delete().eq('id_archivo', fileId);
      if (error) console.error('Error al eliminar de public.archivo:', error.message);
    } catch (e) {}

    // 2. Eliminar de Supabase Storage (nimbox-files)
    if (filePath) {
      try {
        const { error: stErr } = await supabase.storage.from('nimbox-files').remove([filePath]);
        if (stErr) console.error('Error al eliminar de Storage:', stErr.message);
      } catch (e) {}
    }

    // 3. Recalcular almacenamiento usado
    if (activeUserId) {
      try {
        const { data: userFiles } = await supabase.from('archivo').select('tamano').eq('id_usuario', activeUserId);
        const totalBytes = (userFiles || []).reduce((acc, curr) => acc + parseInt(curr.tamano || 0, 10), 0);

        await supabase.from('almacenamiento').upsert({
          id_usuario: activeUserId,
          espacio_usado_bytes: totalBytes,
          ultima_actualizacion: new Date().toISOString()
        }, { onConflict: 'id_usuario' });
      } catch (e) {}
    }

    return true;
  },

  async toggleShareFile(fileId, currentSharedState) {
    return true;
  }
};

export default filesService;
