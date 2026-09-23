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
  if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext)) {
    return { type: 'image', category: 'images' };
  }
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
    return { type: 'video', category: 'media' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { type: 'zip', category: 'docs' };
  }
  if (['pdf'].includes(ext)) {
    return { type: 'pdf', category: 'docs' };
  }
  return { type: 'doc', category: 'docs' };
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
      // Intentar obtener usuario guardado en localStorage
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
        const { category } = detectCategoryAndType(f.nombre);
        return {
          id: f.id_archivo,
          name: f.nombre,
          type: f.tipo || 'doc',
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

    const { type, category } = detectCategoryAndType(file.name);
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
      size_bytes: file.size,
      size: formatBytes(file.size),
      updated: 'Ahora mismo',
      category: category,
      shared: false,
      file_path: uploadedPath
    };
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
    // Si la tabla no tiene columna 'compartido', mantenemos la simulación en el frontend
    return true;
  }
};

export default filesService;
