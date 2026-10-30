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
('33333333-3333-3333-3333-333333333333', 'Empresarial', 'Para organizaciones exigentes', 49.00, 10995116277760, 365, true)
ON CONFLICT (id_plan) DO NOTHING;


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

-- Solo el dueño
DROP POLICY IF EXISTS "Permitir a usuario gestionar sus carpetas" ON public.carpeta;
DROP POLICY IF EXISTS "carpeta_propia" ON public.carpeta;
CREATE POLICY "carpeta_propia" ON public.carpeta
  FOR ALL USING (id_usuario = auth.uid()) WITH CHECK (id_usuario = auth.uid());


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

-- Solo el dueño
DROP POLICY IF EXISTS "Permitir a usuario gestionar sus archivos" ON public.archivo;
DROP POLICY IF EXISTS "archivo_propio" ON public.archivo;
CREATE POLICY "archivo_propio" ON public.archivo
  FOR ALL USING (id_usuario = auth.uid()) WITH CHECK (id_usuario = auth.uid());


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

ALTER TABLE public.archivo_version ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuario gestiona sus versiones" ON public.archivo_version;
CREATE POLICY "Usuario gestiona sus versiones"
  ON public.archivo_version FOR ALL USING (auth.uid() = id_usuario);