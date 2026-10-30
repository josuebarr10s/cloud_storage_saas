import { formatBytes, formatDate } from '../utils/formatters.js';
import { detectCategoryAndType } from '../strategies/fileCategoryStrategy.js';
import { getRoleName, USER_ROLES } from '../constants/roles.js';
import { PLAN_NAMES } from '../constants/plans.js';

/**
 * Patrón Factory / Adapter: Transforma y construye entidades de dominio
 * a partir de las respuestas crudas de la base de datos (PostgreSQL/Supabase).
 */

export class FolderFactory {
  /**
   * Adapta un registro de public.carpeta al modelo de la interfaz de usuario
   * @param {Object} rawFolder 
   * @returns {Object}
   */
  static createFromDb(rawFolder) {
    if (!rawFolder) return null;
    return {
      id: rawFolder.id_carpeta,
      name: rawFolder.nombre,
      color: rawFolder.color || 'purple',
      parentId: rawFolder.id_carpeta_padre || null,
      updated: formatDate(rawFolder.fecha_creacion),
      created_at: rawFolder.fecha_creacion,
      isFolder: true,
    };
  }
}

export class FileFactory {
  /**
   * Adapta un registro de public.archivo al modelo utilizado por el Dashboard
   * @param {Object} rawFile 
   * @returns {Object}
   */
  static createFromDb(rawFile) {
    if (!rawFile) return null;
    const { category, type, ext, mimeCategory } = detectCategoryAndType(rawFile.nombre);
    const bytes = parseInt(rawFile.tamano || 0, 10);

    return {
      id: rawFile.id_archivo,
      name: rawFile.nombre,
      type: rawFile.tipo || type,
      mimeCategory: mimeCategory,
      ext: ext,
      size_bytes: bytes,
      size: formatBytes(bytes),
      updated: formatDate(rawFile.fecha_modificacion || rawFile.fecha_subida),
      updated_at: rawFile.fecha_modificacion || rawFile.fecha_subida,
      category: category,
      shared: false,
      file_path: rawFile.ruta_storage,
      folder_id: rawFile.id_carpeta || null,
      owner_id: rawFile.id_usuario,
      deleted_at: rawFile.fecha_eliminacion || null,
      isFolder: false,
    };
  }
}

export class UserFactory {
  /**
   * Determina la cuota de almacenamiento legible según el nombre del plan
   * @param {string} planName 
   * @returns {string}
   */
  static getQuotaByPlan(planName) {
    const p = (planName || '').toLowerCase();
    if (!planName || planName === PLAN_NAMES.NONE) return '0 GB';
    if (p.includes('básico') || p.includes('basico')) return '10 GB';
    if (p.includes('empresa')) return '2 TB';
    return '500 GB';
  }

  /**
   * Ensambla el perfil de usuario uniforme a partir de la sesión de Supabase Auth y la tabla usuario
   * @param {Object} params
   * @param {Object} params.authData 
   * @param {Object} [params.dbUser] 
   * @param {string} [params.emailFallback]
   * @returns {Object}
   */
  static createProfile({ authUser, dbUser = null, emailFallback = '' }) {
    const email = (authUser?.email || emailFallback || '').toLowerCase().trim();
    const fallbackName = authUser?.user_metadata?.full_name || email.split('@')[0] || 'Usuario';

    if (!dbUser) {
      return {
        id: authUser?.id,
        name: fallbackName,
        email: email,
        rol: USER_ROLES.CLIENT_NAME,
        plan: PLAN_NAMES.NONE,
        planId: null,
        storageQuota: '0 GB',
      };
    }

    const fullName = [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ') || fallbackName;
    const activeSub = Array.isArray(dbUser.suscripcion)
      ? dbUser.suscripcion.find(s => s.estado === 'activa')
      : (dbUser.suscripcion?.estado === 'activa' ? dbUser.suscripcion : null);

    const planName = activeSub?.plan?.nombre || PLAN_NAMES.NONE;
    const planId = activeSub?.id_plan || null;

    return {
      id: authUser?.id || dbUser.id_usuario,
      name: fullName,
      email: email,
      rol: getRoleName(dbUser.id_rol),
      plan: planName,
      planId: planId,
      storageQuota: this.getQuotaByPlan(activeSub ? planName : null),
    };
  }
}
