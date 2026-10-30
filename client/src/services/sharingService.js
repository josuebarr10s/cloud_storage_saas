import supabase from '../lib/supabase.js';
import { FileFactory } from '../factories/entityFactory.js';

const SHARE_PARAM = 'share';
// localStorage (no sessionStorage) para que el enlace sobreviva si el usuario
// confirma su correo en otra pestaña antes de iniciar sesión
const PENDING_SHARE_KEY = 'nimbox_pending_share';

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

/**
 * Patrón Facade: crea, consulta y desactiva enlaces para compartir archivos,
 * y abre los enlaces que otros usuarios comparten.
 */
export const sharingService = {
  /**
   * Token del enlace activo de un archivo propio, o null si es privado
   * @param {string} fileId
   * @returns {Promise<string|null>}
   */
  async getActiveLink(fileId) {
    const { data, error } = await supabase
      .from('enlace_compartido')
      .select('token')
      .eq('id_archivo', fileId)
      .eq('activo', true)
      .maybeSingle();

    if (error) throw new Error(`No se pudo consultar el enlace: ${error.message}`);
    return data?.token || null;
  },

  /**
   * Devuelve el enlace activo del archivo o crea uno nuevo (solo lectura)
   * @param {string} userId
   * @param {string} fileId
   * @returns {Promise<string>} token
   */
  async getOrCreateLink(userId, fileId) {
    const existing = await this.getActiveLink(fileId);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('enlace_compartido')
      .insert([{ id_usuario: userId, id_archivo: fileId, permiso: 'lector' }])
      .select('token')
      .single();

    if (error) {
      // La política enlace_crear rechaza la inserción si el dueño no tiene plan activo
      if (error.code === '42501') throw new Error('Necesitas un plan activo para compartir archivos.');
      throw new Error(`No se pudo crear el enlace: ${error.message}`);
    }
    return data.token;
  },

  /**
   * Desactiva el enlace del archivo: quien lo tenga deja de poder abrirlo
   * @param {string} fileId
   */
  async deactivateLink(fileId) {
    const { error } = await supabase
      .from('enlace_compartido')
      .update({ activo: false })
      .eq('id_archivo', fileId)
      .eq('activo', true);

    if (error) throw new Error(`No se pudo desactivar el enlace: ${error.message}`);
  },

  /**
   * IDs de los archivos propios que tienen un enlace activo.
   * Si falla (por ejemplo, la tabla aún no existe) devuelve un conjunto vacío para no romper el dashboard.
   * @returns {Promise<Set<string>>}
   */
  async getSharedFileIds() {
    const { data, error } = await supabase
      .from('enlace_compartido')
      .select('id_archivo')
      .eq('activo', true)
      .not('id_archivo', 'is', null);

    if (error) {
      console.warn('No se pudieron consultar los enlaces compartidos:', error.message);
      return new Set();
    }
    return new Set(data.map(e => e.id_archivo));
  },

  /**
   * Abre un enlace compartido: lo valida en la BD, registra el acceso y devuelve el archivo
   * @param {string} token
   * @param {number} [retries]
   * @returns {Promise<{ isOwner: boolean, permission: string, ownerName: string, file: Object }>}
   */
  async openSharedLink(token, retries = 3) {
    const { data, error } = await supabase.rpc('canjear_enlace', { p_token: token });
    if (error) {
      // Justo después de registrarse o iniciar sesión, Supabase puede rechazar el token recién emitido
      // durante unos segundos por desfase de reloj entre sus servidores ("JWT issued at future")
      if (retries > 0 && /issued at future/i.test(error.message || '')) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return this.openSharedLink(token, retries - 1);
      }
      throw new Error(error.message || 'No se pudo abrir el enlace.');
    }

    return {
      isOwner: data.es_dueno,
      permission: data.permiso,
      ownerName: data.propietario || 'Un usuario de Nimbox',
      file: FileFactory.createFromDb(data.archivo),
    };
  },
};

export default sharingService;
