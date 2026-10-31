import supabase from '../lib/supabase.js';
import { FileFactory, FolderFactory } from '../factories/entityFactory.js';
import { normalizeText, formatBytes, formatDate } from '../utils/formatters.js';

const SHARE_PARAM = 'share';
// localStorage (no sessionStorage) para que el enlace sobreviva si el usuario
// confirma su correo en otra pestaña antes de iniciar sesión
const PENDING_SHARE_KEY = 'nimbox_pending_share';

export const SHARE_PERMISSIONS = Object.freeze({
  VIEWER: 'lector',
  EDITOR: 'editor',
});

// Códigos que devuelve canjear_enlace cuando el enlace tiene contraseña
export const SHARE_ERRORS = Object.freeze({
  PASSWORD_REQUIRED: 'PASSWORD_REQUIRED',
  PASSWORD_INCORRECT: 'PASSWORD_INCORRECT',
});

const PASSWORD_ERROR_CODES = Object.freeze({
  NB001: SHARE_ERRORS.PASSWORD_REQUIRED,
  NB002: SHARE_ERRORS.PASSWORD_INCORRECT,
});

/**
 * Permisos avanzados (enlaces de editor, expiración y contraseña) son de los planes
 * Pro y Empresarial. La BD lo vuelve a revisar (enlace_crear y configurar_enlace).
 * @param {string} planName
 * @returns {boolean}
 */
export function canUseAdvancedSharing(planName = '') {
  const plan = normalizeText(planName);
  return plan.includes('pro') || plan.includes('empresa');
}

/**
 * Construye la URL pública de un enlace compartido
 * @param {string} token
 * @returns {string}
 */
export function buildShareUrl(token) {
  return `${window.location.origin}${window.location.pathname}?${SHARE_PARAM}=${token}`;
}

/**
 * Si la URL trae ?share=TOKEN, lo guarda como pendiente y lo quita de la barra de direcciones.
 * Devuelve el token pendiente (el de la URL o uno guardado antes), o null.
 * @returns {string|null}
 */
export function takeShareTokenFromUrl() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get(SHARE_PARAM);

  if (token) {
    try { localStorage.setItem(PENDING_SHARE_KEY, token); } catch (e) { /* sin storage: solo se pierde el pendiente */ }
    url.searchParams.delete(SHARE_PARAM);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    return token;
  }

  try { return localStorage.getItem(PENDING_SHARE_KEY); } catch (e) { return null; }
}

export function clearPendingShareToken() {
  try { localStorage.removeItem(PENDING_SHARE_KEY); } catch (e) { /* nada que limpiar */ }
}

// Un enlace apunta a un archivo (id_archivo) o a una carpeta (id_carpeta)
const targetColumn = (item) => (item.isFolder ? 'id_carpeta' : 'id_archivo');

const LINK_COLUMNS = 'token, permiso, fecha_expiracion, tiene_password';

const mapLink = (row) => ({
  token: row.token,
  permission: row.permiso,
  expiresAt: row.fecha_expiracion,
  hasPassword: Boolean(row.tiene_password),
});

/**
 * Patrón Facade: crea, consulta y desactiva enlaces para compartir archivos y carpetas,
 * y abre los enlaces que otros usuarios comparten.
 */
export const sharingService = {
  /**
   * Enlace activo de un archivo o carpeta propios, o null si es privado
   * @param {{ id: string, isFolder: boolean }} item
   * @returns {Promise<{ token: string, permission: string, expiresAt: string|null, hasPassword: boolean }|null>}
   */
  async getActiveLink(item) {
    const { data, error } = await supabase
      .from('enlace_compartido')
      .select(LINK_COLUMNS)
      .eq(targetColumn(item), item.id)
      .eq('activo', true)
      .maybeSingle();

    if (error) throw new Error(`No se pudo consultar el enlace: ${error.message}`);
    return data ? mapLink(data) : null;
  },

  /**
   * Devuelve el enlace activo o crea uno nuevo con el permiso indicado
   * @param {string} userId
   * @param {{ id: string, isFolder: boolean }} item
   * @param {string} permission SHARE_PERMISSIONS
   * @returns {Promise<{ token: string, permission: string, expiresAt: string|null, hasPassword: boolean }>}
   */
  async getOrCreateLink(userId, item, permission = SHARE_PERMISSIONS.VIEWER) {
    const existing = await this.getActiveLink(item);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('enlace_compartido')
      .insert([{ id_usuario: userId, [targetColumn(item)]: item.id, permiso: permission }])
      .select(LINK_COLUMNS)
      .single();

    if (error) {
      // Las políticas de la BD rechazan la inserción si el plan del dueño no lo permite
      if (error.code === '42501') {
        throw new Error(permission === SHARE_PERMISSIONS.EDITOR
          ? 'Los enlaces de editor son para los planes Pro y Empresarial.'
          : 'Necesitas un plan activo para compartir.');
      }
      throw new Error(`No se pudo crear el enlace: ${error.message}`);
    }
    return mapLink(data);
  },

  /**
   * Expiración y contraseña del enlace (Pro y Empresarial). La contraseña se guarda cifrada
   * en la BD; al cambiarla, quien ya había entrado debe escribirla otra vez.
   * @param {string} token
   * @param {{ expiresAt: string|null, password?: string|null, removePassword?: boolean }} options
   *   expiresAt: fecha ISO o null para que no expire; password: null para no cambiarla
   */
  async configureLink(token, { expiresAt, password = null, removePassword = false }) {
    const { error } = await supabase.rpc('configurar_enlace', {
      p_token: token,
      p_fecha_expiracion: expiresAt,
      p_password: password,
      p_quitar_password: removePassword,
    });
    if (error) throw new Error(error.message || 'No se pudo guardar la configuración del enlace.');
  },

  /**
   * Cambia el permiso del enlace activo (el enlace y su token no cambian)
   * @param {{ id: string, isFolder: boolean }} item
   * @param {string} permission
   */
  async updatePermission(item, permission) {
    const { error } = await supabase
      .from('enlace_compartido')
      .update({ permiso: permission })
      .eq(targetColumn(item), item.id)
      .eq('activo', true);

    if (error) {
      if (error.code === '42501') throw new Error('Los enlaces de editor son para los planes Pro y Empresarial.');
      throw new Error(`No se pudo cambiar el permiso: ${error.message}`);
    }
  },

  /**
   * Desactiva el enlace: quien lo tenga deja de poder abrirlo
   * @param {{ id: string, isFolder: boolean }} item
   */
  async deactivateLink(item) {
    const { error } = await supabase
      .from('enlace_compartido')
      .update({ activo: false })
      .eq(targetColumn(item), item.id)
      .eq('activo', true);

    if (error) throw new Error(`No se pudo desactivar el enlace: ${error.message}`);
  },

  /**
   * IDs de los archivos y carpetas propios que tienen un enlace activo.
   * Si falla (por ejemplo, la tabla aún no existe) devuelve conjuntos vacíos para no romper el dashboard.
   * @returns {Promise<{ files: Set<string>, folders: Set<string> }>}
   */
  async getSharedIds() {
    const { data, error } = await supabase
      .from('enlace_compartido')
      .select('id_archivo, id_carpeta')
      .eq('activo', true);

    if (error) {
      console.warn('No se pudieron consultar los enlaces compartidos:', error.message);
      return { files: new Set(), folders: new Set() };
    }
    return {
      files: new Set(data.filter(e => e.id_archivo).map(e => e.id_archivo)),
      folders: new Set(data.filter(e => e.id_carpeta).map(e => e.id_carpeta)),
    };
  },

  /**
   * Abre un enlace compartido: lo valida en la BD, registra el acceso y devuelve
   * el archivo o la carpeta con el permiso efectivo
   * Si el enlace pide contraseña, el error trae code SHARE_ERRORS.PASSWORD_REQUIRED o PASSWORD_INCORRECT.
   * @param {string} token
   * @param {string|null} [password]
   * @param {number} [retries]
   * @returns {Promise<{ isOwner: boolean, permission: string, ownerId: string, ownerName: string,
   *   expiresAt: string|null, type: 'file'|'folder', file: Object|null, folder: Object|null }>}
   */
  async openSharedLink(token, password = null, retries = 3) {
    const { data, error } = await supabase.rpc('canjear_enlace', { p_token: token, p_password: password });
    if (error) {
      // Justo después de registrarse o iniciar sesión, Supabase puede rechazar el token recién emitido
      // durante unos segundos por desfase de reloj entre sus servidores ("JWT issued at future")
      if (retries > 0 && /issued at future/i.test(error.message || '')) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return this.openSharedLink(token, password, retries - 1);
      }
      const shareError = new Error(error.message || 'No se pudo abrir el enlace.');
      shareError.code = PASSWORD_ERROR_CODES[error.code] || null;
      throw shareError;
    }

    return {
      isOwner: data.es_dueno,
      permission: data.permiso,
      ownerId: data.id_propietario,
      ownerName: data.propietario || 'Un usuario de Nimbox',
      expiresAt: data.fecha_expiracion,
      type: data.tipo === 'carpeta' ? 'folder' : 'file',
      file: data.archivo ? FileFactory.createFromDb(data.archivo) : null,
      folder: data.carpeta ? FolderFactory.createFromDb(data.carpeta) : null,
    };
  },

  /**
   * "Compartidos conmigo": lo que el usuario ya abrió por enlace y sigue disponible,
   * con el permiso que le dio el dueño. Para abrirlo se usa el mismo token del enlace.
   * @returns {Promise<Array<{ token: string, type: 'file'|'folder', permission: string,
   *   ownerName: string, name: string, size: string|null, updated: string }>>}
   */
  async getSharedWithMe() {
    const { data, error } = await supabase.rpc('mis_compartidos');
    if (error) throw new Error(`No se pudieron cargar los compartidos: ${error.message}`);

    return (data || []).map(c => ({
      token: c.token,
      type: c.tipo === 'carpeta' ? 'folder' : 'file',
      permission: c.permiso,
      ownerName: c.propietario || 'Un usuario de Nimbox',
      name: c.nombre,
      size: c.tipo === 'archivo' ? formatBytes(Number(c.tamano || 0)) : null,
      updated: formatDate(c.fecha_modificacion),
    }));
  },

  /**
   * Subcarpetas y archivos (fuera de la papelera) de una carpeta compartida.
   * La RLS solo devuelve lo que el usuario puede ver por sus enlaces.
   * @param {string} folderId
   * @returns {Promise<{ folders: Object[], files: Object[] }>}
   */
  async getSharedFolderContents(folderId) {
    const [foldersRes, filesRes] = await Promise.all([
      supabase.from('carpeta').select('*').eq('id_carpeta_padre', folderId).order('nombre', { ascending: true }),
      supabase.from('archivo').select('*').eq('id_carpeta', folderId).eq('eliminado', false).order('nombre', { ascending: true }),
    ]);

    const error = foldersRes.error || filesRes.error;
    if (error) throw new Error(`No se pudo abrir la carpeta: ${error.message}`);

    return {
      folders: (foldersRes.data || []).map(f => FolderFactory.createFromDb(f)),
      files: (filesRes.data || []).map(f => FileFactory.createFromDb(f)),
    };
  },
};

export default sharingService;
