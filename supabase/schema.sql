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
  CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario),
  CONSTRAINT usuario_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT usuario_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.rol(id_rol)
);

ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura y modificacion a usuario propio"
  ON public.usuario FOR ALL USING (true);


-- 4. TRIGGER: Crear registro en usuario y almacenamiento automáticamente tras Auth SignUp
CREATE OR REPLACE FUNCTION public.handle_new_user_custom()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear en public.usuario
  INSERT INTO public.usuario (id_usuario, id_rol, nombre, apellido, estado)
  VALUES (
    NEW.id,
    2,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    'activo'
  )
  ON CONFLICT (id_usuario) DO NOTHING;

  -- Crear en public.almacenamiento (500 GB por defecto)
  INSERT INTO public.almacenamiento (id_usuario, capacidad_total_bytes, espacio_usado_bytes)
  VALUES (
    NEW.id,
    536870912000,
    0
  )
  ON CONFLICT (id_usuario) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_custom ON auth.users;
CREATE TRIGGER on_auth_user_created_custom
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_custom();


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

CREATE POLICY "Permitir a usuario ver/modificar su almacenamiento"
  ON public.almacenamiento FOR ALL USING (true);


-- 6. TABLA SUSCRIPCION
CREATE TABLE IF NOT EXISTS public.suscripcion (
  id_suscripcion UUID NOT NULL DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL,
  id_plan UUID NOT NULL,
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  estado CHARACTER VARYING NOT NULL DEFAULT 'activa'::character varying,
  precio_contratado NUMERIC NOT NULL,
  limite_bytes_contratado BIGINT NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT suscripcion_pkey PRIMARY KEY (id_suscripcion),
  CONSTRAINT suscripcion_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
  CONSTRAINT suscripcion_id_plan_fkey FOREIGN KEY (id_plan) REFERENCES public.plan(id_plan)
);

ALTER TABLE public.suscripcion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir gestión de suscripciones"
  ON public.suscripcion FOR ALL USING (true);


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

CREATE POLICY "Permitir gestión de pagos"
  ON public.pago FOR ALL USING (true);


-- 8. TABLA CARPETA
CREATE TABLE IF NOT EXISTS public.carpeta (
  id_carpeta UUID NOT NULL DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL,
  id_carpeta_padre UUID,
  nombre CHARACTER VARYING NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT carpeta_pkey PRIMARY KEY (id_carpeta),
  CONSTRAINT carpeta_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
  CONSTRAINT carpeta_id_carpeta_padre_fkey FOREIGN KEY (id_carpeta_padre) REFERENCES public.carpeta(id_carpeta) ON DELETE CASCADE
);

ALTER TABLE public.carpeta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir a usuario gestionar sus carpetas"
  ON public.carpeta FOR ALL USING (true);


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

CREATE POLICY "Permitir a usuario gestionar sus archivos"
  ON public.archivo FOR ALL USING (true);


-- =============================================================================
-- 10. POLITICAS Y PERMISOS DEL BUCKET DE STORAGE 'nimbox-files'
-- Permite subida, consulta y eliminación de archivos sin ser bloqueado por RLS
-- =============================================================================

-- Crear bucket público si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('nimbox-files', 'nimbox-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Desactivar políticas restrictivas previas
DROP POLICY IF EXISTS "Permitir subida a nimbox-files" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura en nimbox-files" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminacion en nimbox-files" ON storage.objects;

-- Crear políticas globales para nimbox-files
CREATE POLICY "Permitir subida a nimbox-files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'nimbox-files');

CREATE POLICY "Permitir lectura en nimbox-files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'nimbox-files');

CREATE POLICY "Permitir eliminacion en nimbox-files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'nimbox-files');

CREATE POLICY "Permitir actualizacion en nimbox-files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'nimbox-files');
