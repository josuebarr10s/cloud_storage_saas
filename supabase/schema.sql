-- =============================================================================
-- ESQUEMA COMPLETO DE BASE DE DATOS Y POLITICAS DE STORAGE EN SUPABASE
-- =============================================================================

-- 1. TABLA ROL
CREATE TABLE IF NOT EXISTS public.rol (
  id_rol SMALLINT NOT NULL,
  nombre CHARACTER VARYING NOT NULL UNIQUE,
  descripcion TEXT,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT rol_pkey PRIMARY KEY (id_rol)
);

INSERT INTO public.rol (id_rol, nombre, descripcion)
VALUES 
(1, 'Administrador', 'Control total de la plataforma'),
(2, 'Cliente', 'Usuario final con espacio de almacenamiento en la nube')
ON CONFLICT (id_rol) DO NOTHING;


-- 2. TABLA PLAN
CREATE TABLE IF NOT EXISTS public.plan (
  id_plan UUID NOT NULL DEFAULT gen_random_uuid(),
  nombre CHARACTER VARYING NOT NULL,
  descripcion TEXT,
  precio NUMERIC NOT NULL DEFAULT 0.00,
  limite_almacenamiento_bytes BIGINT NOT NULL,
  duracion_dias INTEGER NOT NULL DEFAULT 30,
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT plan_pkey PRIMARY KEY (id_plan)
);

-- Insertar planes por defecto si no existen
INSERT INTO public.plan (id_plan, nombre, descripcion, precio, limite_almacenamiento_bytes, duracion_dias, activo)
VALUES 
('11111111-1111-1111-1111-111111111111', 'Básico', 'Para uso personal y organización', 5.00, 10737418240, 30, true),
('22222222-2222-2222-2222-222222222222', 'Pro', 'Para profesionales y pequeños equipos', 12.00, 536870912000, 30, true),
('33333333-3333-3333-3333-333333333333', 'Empresarial', 'Para organizaciones exigentes', 49.00, 2199023255552, 365, true)
ON CONFLICT (id_plan) DO NOTHING;

-- El plan Empresarial es de 2 TB (la primera versión de esta semilla decía 10 TB)
UPDATE public.plan SET limite_almacenamiento_bytes = 2199023255552
WHERE id_plan = '33333333-3333-3333-3333-333333333333' AND limite_almacenamiento_bytes <> 2199023255552;


-- 3. TABLA USUARIO
CREATE TABLE IF NOT EXISTS public.usuario (
  id_usuario UUID NOT NULL,
  id_rol SMALLINT NOT NULL DEFAULT 2,
  nombre CHARACTER VARYING,
  apellido CHARACTER VARYING,
  estado CHARACTER VARYING NOT NULL DEFAULT 'activo'::character varying,
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pregunta_usuario text,   -- ya no se usa (la recuperación es por correo)
  respuesta_usuario text,  -- ya no se usa
  CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario),
  CONSTRAINT usuario_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT usuario_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.rol(id_rol)
);

-- ¿El usuario con sesión es administrador? SECURITY DEFINER para poder leer public.usuario
-- desde sus propias políticas sin entrar en recursión de RLS.
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuario WHERE id_usuario = auth.uid() AND id_rol = 1);
$$;

ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;

-- Cada usuario ve y edita solo su perfil; el administrador ve y edita todos.
-- No hay política de INSERT: la fila la crea el trigger handle_new_user (sección 4).
DROP POLICY IF EXISTS "Permitir lectura y modificacion a usuario propio" ON public.usuario;
DROP POLICY IF EXISTS "usuario_ver" ON public.usuario;
DROP POLICY IF EXISTS "usuario_editar" ON public.usuario;
CREATE POLICY "usuario_ver" ON public.usuario
  FOR SELECT USING (id_usuario = auth.uid() OR public.es_admin());
CREATE POLICY "usuario_editar" ON public.usuario
  FOR UPDATE USING (id_usuario = auth.uid() OR public.es_admin());

-- Un cliente no puede cambiarse el rol ni el estado (hacerse admin o quitarse una suspensión).
-- auth.uid() es null en el SQL Editor y en los triggers del servidor: ahí sí se permite.
CREATE OR REPLACE FUNCTION public.proteger_rol_y_estado() RETURNS trigger AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.es_admin()
     AND (NEW.id_rol IS DISTINCT FROM OLD.id_rol OR NEW.estado IS DISTINCT FROM OLD.estado) THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar el rol o el estado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proteger_rol_y_estado ON public.usuario;
CREATE TRIGGER proteger_rol_y_estado
  BEFORE UPDATE ON public.usuario
  FOR EACH ROW EXECUTE FUNCTION public.proteger_rol_y_estado();

-- Políticas de public.plan (van aquí porque necesitan public.es_admin()):
-- cualquiera puede leer los planes (la landing muestra precios sin sesión), solo el admin los modifica.
ALTER TABLE public.plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_ver" ON public.plan;
DROP POLICY IF EXISTS "plan_admin" ON public.plan;
CREATE POLICY "plan_ver" ON public.plan FOR SELECT USING (true);
CREATE POLICY "plan_admin" ON public.plan
  FOR ALL USING (public.es_admin()) WITH CHECK (public.es_admin());


-- 4. TRIGGER: Crear perfil y almacenamiento automáticamente tras Auth SignUp
-- No crea suscripción: el usuario queda "sin plan" (solo ve la landing) hasta que paga
-- (PaymentModal -> plansService.createSubscription).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Perfil en public.usuario
  INSERT INTO public.usuario (id_usuario, id_rol, nombre, apellido, estado)
  VALUES (
    NEW.id,
    2,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    'activo'
  )
  ON CONFLICT (id_usuario) DO NOTHING;

  -- 2. Almacenamiento en 0: sin plan no hay espacio. Al pagar se actualiza al límite del plan.
  INSERT INTO public.almacenamiento (id_usuario, capacidad_total_bytes, espacio_usado_bytes)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (id_usuario) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger anterior (duplicado), ya no se usa
DROP TRIGGER IF EXISTS on_auth_user_created_custom ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_custom();


-- 5. TABLA ALMACENAMIENTO
CREATE TABLE IF NOT EXISTS public.almacenamiento (
  id_almacenamiento UUID NOT NULL DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL UNIQUE,
  capacidad_total_bytes BIGINT NOT NULL DEFAULT 10737418240,
  espacio_usado_bytes BIGINT NOT NULL DEFAULT 0,
  ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT almacenamiento_pkey PRIMARY KEY (id_almacenamiento),
  CONSTRAINT almacenamiento_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE
);

ALTER TABLE public.almacenamiento ENABLE ROW LEVEL SECURITY;

-- Cada usuario lo suyo; el administrador puede leer todo (estadísticas del panel)
DROP POLICY IF EXISTS "Permitir a usuario ver/modificar su almacenamiento" ON public.almacenamiento;
DROP POLICY IF EXISTS "alm_ver" ON public.almacenamiento;
DROP POLICY IF EXISTS "alm_insertar" ON public.almacenamiento;
DROP POLICY IF EXISTS "alm_editar" ON public.almacenamiento;
CREATE POLICY "alm_ver" ON public.almacenamiento
  FOR SELECT USING (id_usuario = auth.uid() OR public.es_admin());
CREATE POLICY "alm_insertar" ON public.almacenamiento
  FOR INSERT WITH CHECK (id_usuario = auth.uid());
CREATE POLICY "alm_editar" ON public.almacenamiento
  FOR UPDATE USING (id_usuario = auth.uid());


-- 6. TABLA SUSCRIPCION
CREATE TABLE IF NOT EXISTS public.suscripcion (
  id_suscripcion UUID NOT NULL DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL,
  id_plan UUID NOT NULL,
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  estado CHARACTER VARYING NOT NULL DEFAULT 'activa'::character varying, -- 'activa' | 'reemplazada' | 'cancelada'
  precio_contratado NUMERIC NOT NULL,
  limite_bytes_contratado BIGINT NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT suscripcion_pkey PRIMARY KEY (id_suscripcion),
  CONSTRAINT suscripcion_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
  CONSTRAINT suscripcion_id_plan_fkey FOREIGN KEY (id_plan) REFERENCES public.plan(id_plan)
);

ALTER TABLE public.suscripcion ENABLE ROW LEVEL SECURITY;

-- Cada usuario lo suyo; el administrador puede leer todo
DROP POLICY IF EXISTS "Permitir gestión de suscripciones" ON public.suscripcion;
DROP POLICY IF EXISTS "sus_ver" ON public.suscripcion;
DROP POLICY IF EXISTS "sus_insertar" ON public.suscripcion;
DROP POLICY IF EXISTS "sus_editar" ON public.suscripcion;
CREATE POLICY "sus_ver" ON public.suscripcion
  FOR SELECT USING (id_usuario = auth.uid() OR public.es_admin());
CREATE POLICY "sus_insertar" ON public.suscripcion
  FOR INSERT WITH CHECK (id_usuario = auth.uid());
CREATE POLICY "sus_editar" ON public.suscripcion
  FOR UPDATE USING (id_usuario = auth.uid());


-- 7. TABLA PAGO
CREATE TABLE IF NOT EXISTS public.pago (
  id_pago UUID NOT NULL DEFAULT gen_random_uuid(),
  id_suscripcion UUID NOT NULL,
  monto NUMERIC NOT NULL,
  metodo_pago CHARACTER VARYING NOT NULL DEFAULT 'tarjeta_simulada'::character varying,
  referencia_transaccion CHARACTER VARYING,
  estado CHARACTER VARYING NOT NULL DEFAULT 'completado'::character varying,
  fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT pago_pkey PRIMARY KEY (id_pago),
  CONSTRAINT pago_id_suscripcion_fkey FOREIGN KEY (id_suscripcion) REFERENCES public.suscripcion(id_suscripcion) ON DELETE CASCADE
);

ALTER TABLE public.pago ENABLE ROW LEVEL SECURITY;

-- Un pago es del usuario dueño de su suscripción; el administrador puede leer todos (ingresos)
DROP POLICY IF EXISTS "Permitir gestión de pagos" ON public.pago;
DROP POLICY IF EXISTS "pago_ver" ON public.pago;
DROP POLICY IF EXISTS "pago_insertar" ON public.pago;
CREATE POLICY "pago_ver" ON public.pago
  FOR SELECT USING (
    public.es_admin() OR EXISTS (
      SELECT 1 FROM public.suscripcion s
      WHERE s.id_suscripcion = pago.id_suscripcion AND s.id_usuario = auth.uid()
    )
  );
CREATE POLICY "pago_insertar" ON public.pago
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.suscripcion s
      WHERE s.id_suscripcion = pago.id_suscripcion AND s.id_usuario = auth.uid()
    )
  );


-- 8. TABLA CARPETA
CREATE TABLE IF NOT EXISTS public.carpeta (
  id_carpeta UUID NOT NULL DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL,
  id_carpeta_padre UUID,
  nombre CHARACTER VARYING NOT NULL,
  color CHARACTER VARYING DEFAULT 'purple',
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT carpeta_pkey PRIMARY KEY (id_carpeta),
  CONSTRAINT carpeta_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
  CONSTRAINT carpeta_id_carpeta_padre_fkey FOREIGN KEY (id_carpeta_padre) REFERENCES public.carpeta(id_carpeta) ON DELETE CASCADE
);

ALTER TABLE public.carpeta ADD COLUMN IF NOT EXISTS color CHARACTER VARYING DEFAULT 'purple';

ALTER TABLE public.carpeta ENABLE ROW LEVEL SECURITY;

-- Dueño de una carpeta. SECURITY DEFINER para usarla en políticas de public.carpeta
-- sin entrar en recursión de RLS.
CREATE OR REPLACE FUNCTION public.dueno_carpeta(p_id_carpeta UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id_usuario FROM public.carpeta WHERE id_carpeta = p_id_carpeta;
$$;

-- Solo el dueño, y la carpeta padre (si hay) también debe ser suya
DROP POLICY IF EXISTS "Permitir a usuario gestionar sus carpetas" ON public.carpeta;
DROP POLICY IF EXISTS "carpeta_propia" ON public.carpeta;
CREATE POLICY "carpeta_propia" ON public.carpeta
  FOR ALL USING (id_usuario = auth.uid())
  WITH CHECK (
    id_usuario = auth.uid()
    AND (id_carpeta_padre IS NULL OR public.dueno_carpeta(id_carpeta_padre) = auth.uid())
  );


-- 9. TABLA ARCHIVO
CREATE TABLE IF NOT EXISTS public.archivo (
  id_archivo UUID NOT NULL DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL,
  id_carpeta UUID,
  nombre CHARACTER VARYING NOT NULL,
  tipo CHARACTER VARYING,
  tamano BIGINT NOT NULL DEFAULT 0,
  ruta_storage CHARACTER VARYING NOT NULL,
  fecha_subida TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT archivo_pkey PRIMARY KEY (id_archivo),
  CONSTRAINT archivo_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
  CONSTRAINT archivo_id_carpeta_fkey FOREIGN KEY (id_carpeta) REFERENCES public.carpeta(id_carpeta) ON DELETE CASCADE
);

ALTER TABLE public.archivo ENABLE ROW LEVEL SECURITY;

-- Solo el dueño, y la carpeta (si hay) también debe ser suya
DROP POLICY IF EXISTS "Permitir a usuario gestionar sus archivos" ON public.archivo;
DROP POLICY IF EXISTS "archivo_propio" ON public.archivo;
CREATE POLICY "archivo_propio" ON public.archivo
  FOR ALL USING (id_usuario = auth.uid())
  WITH CHECK (
    id_usuario = auth.uid()
    AND (id_carpeta IS NULL OR public.dueno_carpeta(id_carpeta) = auth.uid())
  );


-- =============================================================================
-- 10. POLITICAS Y PERMISOS DEL BUCKET DE STORAGE 'nimbox-files'
-- Bucket privado: cada archivo se guarda en {id_usuario}/... y solo su dueño
-- puede leerlo, subirlo, modificarlo o borrarlo.
-- =============================================================================

-- Crear bucket privado si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('nimbox-files', 'nimbox-files', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Quitar las políticas globales anteriores (cualquiera podía leer y borrar todo)
DROP POLICY IF EXISTS "Permitir subida a nimbox-files" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura en nimbox-files" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminacion en nimbox-files" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualizacion en nimbox-files" ON storage.objects;
DROP POLICY IF EXISTS "storage_ver" ON storage.objects;
DROP POLICY IF EXISTS "storage_subir" ON storage.objects;
DROP POLICY IF EXISTS "storage_editar" ON storage.objects;
DROP POLICY IF EXISTS "storage_borrar" ON storage.objects;

-- La primera carpeta de la ruta debe ser el id del usuario con sesión
CREATE POLICY "storage_ver" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'nimbox-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "storage_subir" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'nimbox-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "storage_editar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'nimbox-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "storage_borrar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'nimbox-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- 11. PAPELERA (borrado lógico) E HISTORIAL DE VERSIONES
-- =============================================================================

-- Papelera: marcar en vez de borrar
ALTER TABLE public.archivo
  ADD COLUMN IF NOT EXISTS eliminado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMP WITH TIME ZONE;

-- Historial de versiones
CREATE TABLE IF NOT EXISTS public.archivo_version (
  id_version UUID NOT NULL DEFAULT gen_random_uuid(),
  id_archivo UUID NOT NULL,
  id_usuario UUID NOT NULL,
  tamano BIGINT NOT NULL DEFAULT 0,
  ruta_storage CHARACTER VARYING NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT archivo_version_pkey PRIMARY KEY (id_version),
  CONSTRAINT archivo_version_id_archivo_fkey FOREIGN KEY (id_archivo)
    REFERENCES public.archivo(id_archivo) ON DELETE CASCADE
);

-- Nombre que tenía el archivo en esa versión (se puede renombrar entre versiones)
ALTER TABLE public.archivo_version ADD COLUMN IF NOT EXISTS nombre CHARACTER VARYING;

ALTER TABLE public.archivo_version ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuario gestiona sus versiones" ON public.archivo_version;
CREATE POLICY "Usuario gestiona sus versiones"
  ON public.archivo_version FOR ALL USING (auth.uid() = id_usuario);


-- =============================================================================
-- 12. COMPARTIR POR ENLACE (ARCHIVOS Y CARPETAS)
-- Quien abre un enlace debe tener cuenta. Al abrirlo (canjear_enlace) queda
-- registrado en acceso_compartido y desde ese momento tiene acceso según el permiso:
--   lector: ver y descargar (en una carpeta, también todo lo que hay dentro)
--   editor: además subir versiones nuevas; en una carpeta, también subir archivos,
--           crear subcarpetas y mandar archivos a la papelera del dueño
-- Todo lo que sube un editor queda a nombre del dueño y ocupa su espacio.
-- Crear enlaces exige plan activo. Permisos avanzados (plan Pro o Empresarial):
-- enlaces de editor, fecha de expiración y contraseña. Solo Empresarial: limitar el
-- enlace a ciertos correos y ver quién lo abrió.
-- Esta sección se puede volver a correr completa sin problema.
-- =============================================================================

-- crypt() y gen_salt() para guardar las contraseñas de los enlaces (en Supabase ya
-- viene instalada en el esquema extensions)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ¿El usuario tiene una suscripción activa?
CREATE OR REPLACE FUNCTION public.tiene_plan_activo(p_usuario UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.suscripcion WHERE id_usuario = p_usuario AND estado = 'activa'
  );
$$;

-- ¿Su plan activo incluye permisos avanzados (Pro o Empresarial): editor, expiración y contraseña?
CREATE OR REPLACE FUNCTION public.plan_permite_editor(p_usuario UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.suscripcion s
    JOIN public.plan p ON p.id_plan = s.id_plan
    WHERE s.id_usuario = p_usuario AND s.estado = 'activa'
      AND (lower(p.nombre) LIKE '%pro%' OR lower(p.nombre) LIKE '%empresa%')
  );
$$;

-- ¿Su plan activo es Empresarial? Limitar enlaces a correos y ver quién los abrió.
CREATE OR REPLACE FUNCTION public.plan_empresarial(p_usuario UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.suscripcion s
    JOIN public.plan p ON p.id_plan = s.id_plan
    WHERE s.id_usuario = p_usuario AND s.estado = 'activa'
      AND lower(p.nombre) LIKE '%empresa%'
  );
$$;

-- El enlace en sí: apunta a un archivo o a una carpeta
CREATE TABLE IF NOT EXISTS public.enlace_compartido (
  id_enlace UUID NOT NULL DEFAULT gen_random_uuid(),
  token CHARACTER VARYING NOT NULL
    DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  id_usuario UUID NOT NULL, -- dueño
  id_archivo UUID,
  id_carpeta UUID,
  permiso CHARACTER VARYING NOT NULL DEFAULT 'lector', -- 'lector' | 'editor'
  fecha_expiracion TIMESTAMP WITH TIME ZONE,         -- null = no expira
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT enlace_compartido_pkey PRIMARY KEY (id_enlace),
  CONSTRAINT enlace_compartido_token_key UNIQUE (token),
  CONSTRAINT enlace_compartido_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
  CONSTRAINT enlace_compartido_id_archivo_fkey FOREIGN KEY (id_archivo) REFERENCES public.archivo(id_archivo) ON DELETE CASCADE,
  CONSTRAINT enlace_compartido_id_carpeta_fkey FOREIGN KEY (id_carpeta) REFERENCES public.carpeta(id_carpeta) ON DELETE CASCADE,
  CONSTRAINT enlace_compartido_destino_check CHECK ((id_archivo IS NULL) <> (id_carpeta IS NULL)),
  CONSTRAINT enlace_compartido_permiso_check CHECK (permiso IN ('lector', 'editor'))
);

-- Un solo enlace activo por archivo o carpeta (al desactivarlo se puede crear otro con token nuevo)
CREATE UNIQUE INDEX IF NOT EXISTS enlace_compartido_archivo_activo_idx
  ON public.enlace_compartido (id_archivo) WHERE activo AND id_archivo IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS enlace_compartido_carpeta_activo_idx
  ON public.enlace_compartido (id_carpeta) WHERE activo AND id_carpeta IS NOT NULL;

-- Contraseña opcional del enlace (bcrypt). tiene_password evita leer el hash desde el cliente.
ALTER TABLE public.enlace_compartido ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.enlace_compartido ADD COLUMN IF NOT EXISTS tiene_password BOOLEAN
  GENERATED ALWAYS AS (password_hash IS NOT NULL) STORED;

-- Correos que pueden abrir el enlace (Empresarial). Vacío = cualquiera con cuenta que tenga el enlace.
ALTER TABLE public.enlace_compartido ADD COLUMN IF NOT EXISTS correos_permitidos TEXT[] NOT NULL DEFAULT '{}';

-- Quién ya abrió cada enlace
CREATE TABLE IF NOT EXISTS public.acceso_compartido (
  id_enlace UUID NOT NULL,
  id_usuario UUID NOT NULL,
  fecha_acceso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT acceso_compartido_pkey PRIMARY KEY (id_enlace, id_usuario),
  CONSTRAINT acceso_compartido_id_enlace_fkey FOREIGN KEY (id_enlace) REFERENCES public.enlace_compartido(id_enlace) ON DELETE CASCADE,
  CONSTRAINT acceso_compartido_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE
);

-- Cuántas veces abrió el enlace cada persona (auditoría del plan Empresarial)
ALTER TABLE public.acceso_compartido ADD COLUMN IF NOT EXISTS veces INTEGER NOT NULL DEFAULT 1;

-- Para encontrar rápido el archivo de un objeto de Storage (política storage_ver_compartido)
CREATE INDEX IF NOT EXISTS archivo_ruta_storage_idx ON public.archivo (ruta_storage);

ALTER TABLE public.enlace_compartido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acceso_compartido ENABLE ROW LEVEL SECURITY;

-- Enlaces: solo el dueño los ve y administra. Para crear uno necesita plan activo y que
-- el archivo o la carpeta sean suyos; para que sea de editor, plan Pro o Empresarial.
-- Desactivar un enlace no exige plan.
DROP POLICY IF EXISTS "enlace_ver" ON public.enlace_compartido;
DROP POLICY IF EXISTS "enlace_crear" ON public.enlace_compartido;
DROP POLICY IF EXISTS "enlace_editar" ON public.enlace_compartido;
DROP POLICY IF EXISTS "enlace_borrar" ON public.enlace_compartido;
CREATE POLICY "enlace_ver" ON public.enlace_compartido
  FOR SELECT USING (id_usuario = auth.uid());
CREATE POLICY "enlace_crear" ON public.enlace_compartido
  FOR INSERT WITH CHECK (
    id_usuario = auth.uid()
    AND public.tiene_plan_activo(auth.uid())
    AND (permiso = 'lector' OR public.plan_permite_editor(auth.uid()))
    AND (id_archivo IS NULL OR EXISTS (
      SELECT 1 FROM public.archivo a WHERE a.id_archivo = enlace_compartido.id_archivo AND a.id_usuario = auth.uid()
    ))
    AND (id_carpeta IS NULL OR EXISTS (
      SELECT 1 FROM public.carpeta c WHERE c.id_carpeta = enlace_compartido.id_carpeta AND c.id_usuario = auth.uid()
    ))
  );
CREATE POLICY "enlace_editar" ON public.enlace_compartido
  FOR UPDATE USING (id_usuario = auth.uid())
  WITH CHECK (
    id_usuario = auth.uid()
    AND (NOT activo OR permiso = 'lector' OR public.plan_permite_editor(auth.uid()))
  );
CREATE POLICY "enlace_borrar" ON public.enlace_compartido
  FOR DELETE USING (id_usuario = auth.uid());

-- Accesos: cada quien ve los suyos y el dueño ve quién abrió sus enlaces.
-- No hay INSERT desde el cliente: solo canjear_enlace() los registra.
DROP POLICY IF EXISTS "acceso_ver" ON public.acceso_compartido;
CREATE POLICY "acceso_ver" ON public.acceso_compartido
  FOR SELECT USING (
    id_usuario = auth.uid() OR EXISTS (
      SELECT 1 FROM public.enlace_compartido e
      WHERE e.id_enlace = acceso_compartido.id_enlace AND e.id_usuario = auth.uid()
    )
  );

-- Permiso del usuario con sesión sobre una carpeta por los enlaces que ya abrió:
-- 'editor', 'lector' o null. Se hereda de cualquier carpeta superior compartida.
-- Un enlace de editor solo cuenta como tal mientras el plan del dueño lo permita.
CREATE OR REPLACE FUNCTION public.permiso_compartido_carpeta(p_id_carpeta UUID)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE ancestros AS (
    SELECT id_carpeta, id_carpeta_padre, 0 AS nivel
    FROM public.carpeta WHERE id_carpeta = p_id_carpeta
    UNION ALL
    SELECT c.id_carpeta, c.id_carpeta_padre, a.nivel + 1
    FROM public.carpeta c JOIN ancestros a ON c.id_carpeta = a.id_carpeta_padre
    WHERE a.nivel < 50 -- tope por si alguna carpeta quedó en un ciclo
  )
  SELECT CASE
    WHEN bool_or(e.permiso = 'editor' AND public.plan_permite_editor(e.id_usuario)) THEN 'editor'
    WHEN count(*) > 0 THEN 'lector'
  END
  FROM ancestros an
  JOIN public.enlace_compartido e ON e.id_carpeta = an.id_carpeta
  JOIN public.acceso_compartido ac ON ac.id_enlace = e.id_enlace AND ac.id_usuario = auth.uid()
  WHERE e.activo
    AND (e.fecha_expiracion IS NULL OR e.fecha_expiracion > NOW())
    AND public.tiene_plan_activo(e.id_usuario);
$$;

-- Permiso sobre un archivo: por un enlace directo al archivo o por la carpeta que lo contiene
CREATE OR REPLACE FUNCTION public.permiso_compartido_archivo(p_id_archivo UUID, p_id_carpeta UUID)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH permisos AS (
    SELECT CASE WHEN e.permiso = 'editor' AND public.plan_permite_editor(e.id_usuario)
                THEN 'editor' ELSE 'lector' END AS permiso
    FROM public.enlace_compartido e
    JOIN public.acceso_compartido ac ON ac.id_enlace = e.id_enlace AND ac.id_usuario = auth.uid()
    WHERE e.id_archivo = p_id_archivo
      AND e.activo
      AND (e.fecha_expiracion IS NULL OR e.fecha_expiracion > NOW())
      AND public.tiene_plan_activo(e.id_usuario)
    UNION ALL
    SELECT public.permiso_compartido_carpeta(p_id_carpeta)
  )
  SELECT CASE
    WHEN bool_or(permiso = 'editor') THEN 'editor'
    WHEN bool_or(permiso = 'lector') THEN 'lector'
  END
  FROM permisos;
$$;

-- Lo mismo, buscando la carpeta del archivo (para tablas que solo guardan id_archivo)
CREATE OR REPLACE FUNCTION public.permiso_compartido_de_archivo(p_id_archivo UUID)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.permiso_compartido_archivo(a.id_archivo, a.id_carpeta)
  FROM public.archivo a WHERE a.id_archivo = p_id_archivo;
$$;

CREATE OR REPLACE FUNCTION public.dueno_archivo(p_id_archivo UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id_usuario FROM public.archivo WHERE id_archivo = p_id_archivo;
$$;

-- ¿Puede leer este objeto de Storage por un enlace?
CREATE OR REPLACE FUNCTION public.puede_leer_objeto_compartido(p_ruta TEXT)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.archivo a
    WHERE a.ruta_storage = p_ruta
      AND a.eliminado = false
      AND public.permiso_compartido_archivo(a.id_archivo, a.id_carpeta) IS NOT NULL
  );
$$;

-- ¿Puede subir objetos a la carpeta de Storage de este dueño? (tiene algún enlace suyo de editor)
CREATE OR REPLACE FUNCTION public.puede_subir_como(p_dueno TEXT)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enlace_compartido e
    JOIN public.acceso_compartido ac ON ac.id_enlace = e.id_enlace AND ac.id_usuario = auth.uid()
    WHERE e.id_usuario::text = p_dueno
      AND e.permiso = 'editor'
      AND e.activo
      AND (e.fecha_expiracion IS NULL OR e.fecha_expiracion > NOW())
      AND public.plan_permite_editor(e.id_usuario)
  );
$$;

-- Archivos compartidos: se suman a archivo_propio.
-- Ver: archivos fuera de la papelera (el editor también ve los que manda a la papelera, porque
-- Postgres exige poder ver la fila después de un UPDATE). Editor: subir archivos a la carpeta
-- compartida (a nombre del dueño) y modificar los existentes (versión nueva o papelera).
DROP POLICY IF EXISTS "archivo_compartido_ver" ON public.archivo;
DROP POLICY IF EXISTS "archivo_compartido_subir" ON public.archivo;
DROP POLICY IF EXISTS "archivo_compartido_editar" ON public.archivo;
CREATE POLICY "archivo_compartido_ver" ON public.archivo
  FOR SELECT USING (
    CASE WHEN eliminado
      THEN public.permiso_compartido_archivo(id_archivo, id_carpeta) = 'editor'
      ELSE public.permiso_compartido_archivo(id_archivo, id_carpeta) IS NOT NULL
    END
  );
CREATE POLICY "archivo_compartido_subir" ON public.archivo
  FOR INSERT WITH CHECK (
    public.permiso_compartido_carpeta(id_carpeta) = 'editor'
    AND id_usuario = public.dueno_carpeta(id_carpeta)
  );
CREATE POLICY "archivo_compartido_editar" ON public.archivo
  FOR UPDATE USING (
    eliminado = false AND public.permiso_compartido_archivo(id_archivo, id_carpeta) = 'editor'
  )
  WITH CHECK (public.permiso_compartido_archivo(id_archivo, id_carpeta) = 'editor');

-- Quien edita por un enlace no puede cambiar el dueño de un archivo ni sacarlo de su carpeta
CREATE OR REPLACE FUNCTION public.proteger_archivo_compartido() RETURNS trigger AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND OLD.id_usuario <> auth.uid()
     AND (NEW.id_usuario IS DISTINCT FROM OLD.id_usuario OR NEW.id_carpeta IS DISTINCT FROM OLD.id_carpeta) THEN
    RAISE EXCEPTION 'Solo el dueño puede mover este archivo.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proteger_archivo_compartido ON public.archivo;
CREATE TRIGGER proteger_archivo_compartido
  BEFORE UPDATE ON public.archivo
  FOR EACH ROW EXECUTE FUNCTION public.proteger_archivo_compartido();

-- Carpetas compartidas: ver la carpeta y todo lo que tiene dentro; un editor puede crear
-- subcarpetas (a nombre del dueño). Se revisa también el padre para que una carpeta
-- recién creada pase la lectura del INSERT ... RETURNING.
DROP POLICY IF EXISTS "carpeta_compartida_ver" ON public.carpeta;
DROP POLICY IF EXISTS "carpeta_compartida_crear" ON public.carpeta;
CREATE POLICY "carpeta_compartida_ver" ON public.carpeta
  FOR SELECT USING (
    public.permiso_compartido_carpeta(id_carpeta) IS NOT NULL
    OR public.permiso_compartido_carpeta(id_carpeta_padre) IS NOT NULL
  );
CREATE POLICY "carpeta_compartida_crear" ON public.carpeta
  FOR INSERT WITH CHECK (
    public.permiso_compartido_carpeta(id_carpeta_padre) = 'editor'
    AND id_usuario = public.dueno_carpeta(id_carpeta_padre)
  );

-- Versiones: un editor guarda en el historial del dueño la versión que reemplaza
DROP POLICY IF EXISTS "version_compartida_crear" ON public.archivo_version;
CREATE POLICY "version_compartida_crear" ON public.archivo_version
  FOR INSERT WITH CHECK (
    id_usuario = public.dueno_archivo(id_archivo)
    AND public.permiso_compartido_de_archivo(id_archivo) = 'editor'
  );

-- Storage: leer lo compartido y, como editor, subir a la carpeta {id_dueño}/ del dueño
DROP POLICY IF EXISTS "storage_ver_compartido" ON storage.objects;
DROP POLICY IF EXISTS "storage_subir_compartido" ON storage.objects;
CREATE POLICY "storage_ver_compartido" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'nimbox-files' AND public.puede_leer_objeto_compartido(name));
CREATE POLICY "storage_subir_compartido" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'nimbox-files' AND public.puede_subir_como((storage.foldername(name))[1]));

-- Función de la primera versión de esta sección, reemplazada por permiso_compartido_archivo
DROP FUNCTION IF EXISTS public.tiene_acceso_compartido(UUID);

-- Espacio usado: se recalcula en la BD cada vez que cambian los archivos o versiones de un
-- usuario, porque un editor no puede actualizar el almacenamiento del dueño desde el cliente.
CREATE OR REPLACE FUNCTION public.actualizar_espacio_usado() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_usuario UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_usuario := OLD.id_usuario;
  ELSE
    v_usuario := NEW.id_usuario;
  END IF;

  UPDATE public.almacenamiento
  SET espacio_usado_bytes =
        COALESCE((SELECT SUM(tamano) FROM public.archivo WHERE id_usuario = v_usuario), 0)
      + COALESCE((SELECT SUM(tamano) FROM public.archivo_version WHERE id_usuario = v_usuario), 0),
      ultima_actualizacion = NOW()
  WHERE id_usuario = v_usuario;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS actualizar_espacio_archivo ON public.archivo;
CREATE TRIGGER actualizar_espacio_archivo
  AFTER INSERT OR DELETE OR UPDATE OF tamano ON public.archivo
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_espacio_usado();

DROP TRIGGER IF EXISTS actualizar_espacio_version ON public.archivo_version;
CREATE TRIGGER actualizar_espacio_version
  AFTER INSERT OR DELETE ON public.archivo_version
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_espacio_usado();

-- Expiración y contraseña de un enlace propio (permisos avanzados).
-- p_fecha_expiracion: null = no expira. p_password: null = no cambiarla.
-- Al poner una contraseña nueva, quien ya había abierto el enlace debe escribirla otra vez.
-- Quitar la expiración o la contraseña no exige plan (por si el dueño bajó de plan).
CREATE OR REPLACE FUNCTION public.configurar_enlace(
  p_token TEXT,
  p_fecha_expiracion TIMESTAMP WITH TIME ZONE,
  p_password TEXT DEFAULT NULL,
  p_quitar_password BOOLEAN DEFAULT false
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_enlace public.enlace_compartido%ROWTYPE;
BEGIN
  SELECT * INTO v_enlace FROM public.enlace_compartido
  WHERE token = p_token AND id_usuario = auth.uid() AND activo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el enlace.';
  END IF;

  IF (p_fecha_expiracion IS NOT NULL OR p_password IS NOT NULL)
     AND NOT public.plan_permite_editor(auth.uid()) THEN
    RAISE EXCEPTION 'La expiración y la contraseña son para los planes Pro y Empresarial.';
  END IF;

  IF p_fecha_expiracion IS NOT NULL AND p_fecha_expiracion <= NOW() THEN
    RAISE EXCEPTION 'La fecha de expiración debe ser posterior a hoy.';
  END IF;

  IF p_password IS NOT NULL AND length(p_password) < 4 THEN
    RAISE EXCEPTION 'La contraseña debe tener al menos 4 caracteres.';
  END IF;

  UPDATE public.enlace_compartido
  SET fecha_expiracion = p_fecha_expiracion,
      password_hash = CASE
        WHEN p_quitar_password THEN NULL
        WHEN p_password IS NOT NULL THEN crypt(p_password, gen_salt('bf'))
        ELSE password_hash
      END
  WHERE id_enlace = v_enlace.id_enlace;

  IF p_password IS NOT NULL AND NOT p_quitar_password THEN
    DELETE FROM public.acceso_compartido WHERE id_enlace = v_enlace.id_enlace;
  END IF;
END;
$$;

-- Limitar un enlace propio a ciertos correos (Empresarial). Lista vacía = sin límite (no exige plan).
-- Quien ya había entrado y no está en la lista pierde el acceso.
CREATE OR REPLACE FUNCTION public.configurar_correos_enlace(p_token TEXT, p_correos TEXT[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_enlace public.enlace_compartido%ROWTYPE;
  v_correos TEXT[];
BEGIN
  SELECT * INTO v_enlace FROM public.enlace_compartido
  WHERE token = p_token AND id_usuario = auth.uid() AND activo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el enlace.';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT lower(trim(c))) FILTER (WHERE trim(c) <> ''), '{}')
  INTO v_correos
  FROM unnest(COALESCE(p_correos, '{}')) AS c;

  IF cardinality(v_correos) > 0 AND NOT public.plan_empresarial(auth.uid()) THEN
    RAISE EXCEPTION 'Limitar el enlace a ciertos correos es del plan Empresarial.';
  END IF;

  IF cardinality(v_correos) > 100 THEN
    RAISE EXCEPTION 'Puedes invitar hasta 100 correos por enlace.';
  END IF;

  IF EXISTS (SELECT 1 FROM unnest(v_correos) AS c WHERE c !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') THEN
    RAISE EXCEPTION 'Revisa los correos: hay uno que no es válido.';
  END IF;

  UPDATE public.enlace_compartido SET correos_permitidos = v_correos WHERE id_enlace = v_enlace.id_enlace;

  IF cardinality(v_correos) > 0 THEN
    DELETE FROM public.acceso_compartido ac
    USING auth.users u
    WHERE ac.id_enlace = v_enlace.id_enlace
      AND u.id = ac.id_usuario
      AND lower(u.email) <> ALL (v_correos);
  END IF;
END;
$$;

-- Quién abrió un enlace propio, cuándo fue la última vez y cuántas veces (Empresarial)
CREATE OR REPLACE FUNCTION public.accesos_enlace(p_token TEXT)
RETURNS TABLE (usuario_nombre TEXT, usuario_correo TEXT, ultimo_acceso TIMESTAMP WITH TIME ZONE, veces_abierto INTEGER)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.enlace_compartido e WHERE e.token = p_token AND e.id_usuario = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No se encontró el enlace.';
  END IF;

  IF NOT public.plan_empresarial(auth.uid()) THEN
    RAISE EXCEPTION 'Ver quién abrió tus enlaces es del plan Empresarial.';
  END IF;

  RETURN QUERY
  SELECT
    trim(concat_ws(' ', us.nombre, us.apellido))::text,
    u.email::text,
    ac.fecha_acceso,
    ac.veces
  FROM public.acceso_compartido ac
  JOIN public.enlace_compartido e ON e.id_enlace = ac.id_enlace
  JOIN auth.users u ON u.id = ac.id_usuario
  LEFT JOIN public.usuario us ON us.id_usuario = ac.id_usuario
  WHERE e.token = p_token
  ORDER BY ac.fecha_acceso DESC;
END;
$$;

-- Abre un enlace: lo valida, registra el acceso y devuelve el archivo o la carpeta con el
-- permiso efectivo. Los mensajes de RAISE EXCEPTION llegan tal cual al frontend; los de la
-- contraseña llevan su propio código (NB001 falta, NB002 incorrecta) para pedirla en pantalla,
-- y NB003 indica que el correo de la cuenta no está entre los invitados.
-- La versión anterior recibía solo p_token: se borra para que no queden dos funciones con el mismo nombre.
DROP FUNCTION IF EXISTS public.canjear_enlace(TEXT);
CREATE OR REPLACE FUNCTION public.canjear_enlace(p_token TEXT, p_password TEXT DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_enlace public.enlace_compartido%ROWTYPE;
  v_archivo public.archivo%ROWTYPE;
  v_carpeta public.carpeta%ROWTYPE;
  v_propietario TEXT;
  v_permiso TEXT;
  v_correo TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Inicia sesión para abrir este enlace.';
  END IF;

  SELECT * INTO v_enlace FROM public.enlace_compartido WHERE token = p_token;
  IF NOT FOUND OR NOT v_enlace.activo THEN
    RAISE EXCEPTION 'Este enlace no existe o fue desactivado por su dueño.';
  END IF;

  IF v_enlace.fecha_expiracion IS NOT NULL AND v_enlace.fecha_expiracion <= NOW() THEN
    RAISE EXCEPTION 'Este enlace ya expiró.';
  END IF;

  IF NOT public.tiene_plan_activo(v_enlace.id_usuario) THEN
    RAISE EXCEPTION 'Este enlace está pausado porque el plan de quien lo compartió no está activo.';
  END IF;

  -- Enlace limitado a ciertos correos: se revisa antes de pedir la contraseña
  IF cardinality(v_enlace.correos_permitidos) > 0 AND v_enlace.id_usuario <> auth.uid() THEN
    SELECT lower(email) INTO v_correo FROM auth.users WHERE id = auth.uid();
    IF v_correo IS NULL OR NOT (v_correo = ANY (v_enlace.correos_permitidos)) THEN
      RAISE EXCEPTION 'Este enlace es solo para personas invitadas y tu cuenta (%) no está en la lista. Pídele acceso a quien te lo compartió.',
        COALESCE(v_correo, 'sin correo') USING ERRCODE = 'NB003';
    END IF;
  END IF;

  -- La contraseña se pide solo la primera vez: después basta con el acceso registrado
  IF v_enlace.password_hash IS NOT NULL
     AND v_enlace.id_usuario <> auth.uid()
     AND NOT EXISTS (
       SELECT 1 FROM public.acceso_compartido
       WHERE id_enlace = v_enlace.id_enlace AND id_usuario = auth.uid()
     ) THEN
    IF COALESCE(p_password, '') = '' THEN
      RAISE EXCEPTION 'Este enlace está protegido con contraseña.' USING ERRCODE = 'NB001';
    ELSIF crypt(p_password, v_enlace.password_hash) <> v_enlace.password_hash THEN
      RAISE EXCEPTION 'La contraseña no es correcta.' USING ERRCODE = 'NB002';
    END IF;
  END IF;

  IF v_enlace.id_archivo IS NOT NULL THEN
    SELECT * INTO v_archivo FROM public.archivo WHERE id_archivo = v_enlace.id_archivo;
    IF NOT FOUND OR v_archivo.eliminado THEN
      RAISE EXCEPTION 'Este archivo ya no está disponible.';
    END IF;
  ELSE
    SELECT * INTO v_carpeta FROM public.carpeta WHERE id_carpeta = v_enlace.id_carpeta;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Esta carpeta ya no está disponible.';
    END IF;
  END IF;

  IF v_enlace.id_usuario <> auth.uid() THEN
    INSERT INTO public.acceso_compartido (id_enlace, id_usuario)
    VALUES (v_enlace.id_enlace, auth.uid())
    ON CONFLICT (id_enlace, id_usuario)
    DO UPDATE SET fecha_acceso = NOW(), veces = public.acceso_compartido.veces + 1;
  END IF;

  SELECT trim(concat_ws(' ', nombre, apellido)) INTO v_propietario
  FROM public.usuario WHERE id_usuario = v_enlace.id_usuario;

  -- Si el dueño bajó a un plan sin permisos avanzados, sus enlaces de editor quedan como lectura
  v_permiso := CASE
    WHEN v_enlace.permiso = 'editor' AND public.plan_permite_editor(v_enlace.id_usuario) THEN 'editor'
    ELSE 'lector'
  END;

  RETURN json_build_object(
    'es_dueno', v_enlace.id_usuario = auth.uid(),
    'permiso', v_permiso,
    'propietario', v_propietario,
    'id_propietario', v_enlace.id_usuario,
    'fecha_expiracion', v_enlace.fecha_expiracion,
    'tipo', CASE WHEN v_enlace.id_archivo IS NOT NULL THEN 'archivo' ELSE 'carpeta' END,
    'archivo', CASE WHEN v_enlace.id_archivo IS NOT NULL THEN row_to_json(v_archivo) END,
    'carpeta', CASE WHEN v_enlace.id_carpeta IS NOT NULL THEN row_to_json(v_carpeta) END
  );
END;
$$;

-- "Compartidos conmigo": lo que el usuario ya abrió por enlace y sigue disponible
-- (enlace activo y vigente, dueño con plan y archivo fuera de la papelera), con el
-- permiso efectivo. SECURITY DEFINER porque quien recibe no puede leer enlace_compartido.
CREATE OR REPLACE FUNCTION public.mis_compartidos()
RETURNS TABLE (
  token TEXT,
  tipo TEXT,
  permiso TEXT,
  propietario TEXT,
  nombre TEXT,
  tamano BIGINT,
  fecha_modificacion TIMESTAMP WITH TIME ZONE,
  fecha_acceso TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    e.token::text,
    CASE WHEN e.id_archivo IS NOT NULL THEN 'archivo' ELSE 'carpeta' END,
    CASE WHEN e.permiso = 'editor' AND public.plan_permite_editor(e.id_usuario) THEN 'editor' ELSE 'lector' END,
    trim(concat_ws(' ', u.nombre, u.apellido)),
    COALESCE(a.nombre, c.nombre)::text,
    a.tamano,
    COALESCE(a.fecha_modificacion, c.fecha_creacion),
    ac.fecha_acceso
  FROM public.acceso_compartido ac
  JOIN public.enlace_compartido e ON e.id_enlace = ac.id_enlace
  JOIN public.usuario u ON u.id_usuario = e.id_usuario
  LEFT JOIN public.archivo a ON a.id_archivo = e.id_archivo
  LEFT JOIN public.carpeta c ON c.id_carpeta = e.id_carpeta
  WHERE ac.id_usuario = auth.uid()
    AND e.activo
    AND (e.fecha_expiracion IS NULL OR e.fecha_expiracion > NOW())
    AND public.tiene_plan_activo(e.id_usuario)
    AND (e.id_carpeta IS NOT NULL OR a.eliminado = false)
  ORDER BY ac.fecha_acceso DESC;
$$;


-- =============================================================================
-- 13. COBRO AUTOMÁTICO MENSUAL / ANUAL DE SUSCRIPCIONES
-- Cuando una suscripción activa alcanza su fecha_fin, se renueva automáticamente
-- por el siguiente ciclo (30 días mensual o 365 días anual), marcando el ciclo
-- anterior como 'reemplazada' y registrando el pago correspondiente en public.pago.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.procesar_renovaciones_suscripcion(
  p_usuario UUID DEFAULT auth.uid(),
  p_ahora TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.suscripcion%ROWTYPE;
  v_plan_precio NUMERIC;
  v_plan_bytes BIGINT;
  v_es_anual BOOLEAN;
  v_dias INTEGER;
  v_inicio TIMESTAMP WITH TIME ZONE;
  v_fin TIMESTAMP WITH TIME ZONE;
  v_nuevo_id UUID;
  v_metodo TEXT;
  v_renovaciones INTEGER := 0;
BEGIN
  IF p_usuario IS NULL THEN
    RETURN 0;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> p_usuario AND NOT public.es_admin() THEN
    RAISE EXCEPTION 'No autorizado para procesar renovaciones de otro usuario.';
  END IF;

  SELECT * INTO v_sub
  FROM public.suscripcion
  WHERE id_usuario = p_usuario AND estado = 'activa'
  ORDER BY fecha_fin DESC
  LIMIT 1;

  IF NOT FOUND OR v_sub.fecha_fin > p_ahora THEN
    RETURN 0;
  END IF;

  SELECT precio, limite_almacenamiento_bytes INTO v_plan_precio, v_plan_bytes
  FROM public.plan WHERE id_plan = v_sub.id_plan;

  v_es_anual := CASE
    WHEN COALESCE(v_plan_precio, 0) > 0 AND COALESCE(v_sub.precio_contratado, 0) >= v_plan_precio * 6 THEN true
    WHEN EXTRACT(EPOCH FROM (v_sub.fecha_fin - v_sub.fecha_inicio)) / 86400 >= 300 THEN true
    ELSE false
  END;
  v_dias := CASE WHEN v_es_anual THEN 365 ELSE 30 END;

  SELECT COALESCE(p.metodo_pago, 'tarjeta_simulada') INTO v_metodo
  FROM public.pago p
  JOIN public.suscripcion s ON s.id_suscripcion = p.id_suscripcion
  WHERE s.id_usuario = p_usuario
  ORDER BY p.fecha_pago DESC
  LIMIT 1;

  v_metodo := COALESCE(v_metodo, 'tarjeta_simulada');
  v_inicio := v_sub.fecha_fin;

  WHILE v_inicio <= p_ahora AND v_renovaciones < 36 LOOP
    v_renovaciones := v_renovaciones + 1;
    v_fin := v_inicio + make_interval(days => v_dias);

    INSERT INTO public.suscripcion (
      id_usuario, id_plan, fecha_inicio, fecha_fin, estado, precio_contratado, limite_bytes_contratado
    )
    VALUES (
      p_usuario,
      v_sub.id_plan,
      v_inicio,
      v_fin,
      CASE WHEN v_fin > p_ahora OR v_renovaciones = 36 THEN 'activa' ELSE 'reemplazada' END,
      v_sub.precio_contratado,
      COALESCE(v_sub.limite_bytes_contratado, v_plan_bytes, 10737418240)
    )
    RETURNING id_suscripcion INTO v_nuevo_id;

    INSERT INTO public.pago (
      id_suscripcion, monto, metodo_pago, referencia_transaccion, estado, fecha_pago
    )
    VALUES (
      v_nuevo_id,
      v_sub.precio_contratado,
      v_metodo,
      'NMB-' || (EXTRACT(EPOCH FROM v_inicio)::BIGINT * 1000)::TEXT || '-' || UPPER(SUBSTRING(REPLACE(v_nuevo_id::TEXT, '-', '') FROM 1 FOR 4)),
      'completado',
      v_inicio
    );

    v_inicio := v_fin;
  END LOOP;

  IF v_nuevo_id IS NOT NULL THEN
    UPDATE public.suscripcion
    SET estado = 'reemplazada'
    WHERE id_usuario = p_usuario
      AND estado = 'activa'
      AND id_suscripcion <> v_nuevo_id;
  END IF;

  RETURN v_renovaciones;
END;
$$;


-- =============================================================================
-- 14. CONTROL DE CUOTA (RF-15)
-- No se puede subir más de lo que permite el plan: cuenta el espacio de los archivos
-- (incluida la papelera) y de sus versiones anteriores. La app pregunta antes de subir
-- (espacio_disponible) y la BD lo vuelve a revisar al guardar (trigger validar_cuota).
-- =============================================================================

-- Bytes que ocupa un usuario: archivos (también los de la papelera) y versiones anteriores
CREATE OR REPLACE FUNCTION public.espacio_usado_real(p_usuario UUID)
RETURNS BIGINT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT SUM(tamano) FROM public.archivo WHERE id_usuario = p_usuario), 0)
       + COALESCE((SELECT SUM(tamano) FROM public.archivo_version WHERE id_usuario = p_usuario), 0);
$$;

-- Bytes libres de un usuario. La consulta el dueño, quien edita por un enlace suyo o el admin.
CREATE OR REPLACE FUNCTION public.espacio_disponible(p_usuario UUID)
RETURNS BIGINT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR (
    auth.uid() <> p_usuario
    AND NOT public.puede_subir_como(p_usuario::text)
    AND NOT public.es_admin()
  ) THEN
    RAISE EXCEPTION 'No autorizado para consultar el espacio de otro usuario.';
  END IF;

  RETURN COALESCE((SELECT capacidad_total_bytes FROM public.almacenamiento WHERE id_usuario = p_usuario), 0)
       - public.espacio_usado_real(p_usuario);
END;
$$;

-- Rechaza lo que no quepa en el plan del dueño: un archivo nuevo, una versión que pasa al
-- historial o un archivo que crece. Al subir una versión nueva primero se guarda la anterior en
-- archivo_version y después cambia el tamaño del archivo, así que cada paso se revisa por separado.
CREATE OR REPLACE FUNCTION public.validar_cuota() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_extra BIGINT;
  v_capacidad BIGINT;
  v_usado BIGINT;
BEGIN
  v_extra := NEW.tamano - CASE WHEN TG_OP = 'UPDATE' THEN OLD.tamano ELSE 0 END;
  IF v_extra <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(capacidad_total_bytes, 0) INTO v_capacidad
  FROM public.almacenamiento WHERE id_usuario = NEW.id_usuario;
  v_usado := public.espacio_usado_real(NEW.id_usuario);

  IF v_usado + v_extra > COALESCE(v_capacidad, 0) THEN
    RAISE EXCEPTION 'No hay espacio suficiente: se necesitan % y quedan %. Libera espacio vaciando la papelera o cambia a un plan con más capacidad.',
      pg_size_pretty(v_extra), pg_size_pretty(GREATEST(COALESCE(v_capacidad, 0) - v_usado, 0))
      USING ERRCODE = 'NB010';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_cuota_archivo ON public.archivo;
CREATE TRIGGER validar_cuota_archivo
  BEFORE INSERT OR UPDATE OF tamano ON public.archivo
  FOR EACH ROW EXECUTE FUNCTION public.validar_cuota();

DROP TRIGGER IF EXISTS validar_cuota_version ON public.archivo_version;
CREATE TRIGGER validar_cuota_version
  BEFORE INSERT ON public.archivo_version
  FOR EACH ROW EXECUTE FUNCTION public.validar_cuota();
