# Nimbox

Plataforma de almacenamiento en la nube (Storage as a Service) desarrollada para el curso **Ingeniería de Software I** de la Universidad Rafael Landívar.

**Sistema en producción:** https://nimbox-cloud.vercel.app

## Funcionalidades

- Registro con confirmación de correo, inicio de sesión y recuperación de contraseña.
- Planes Básico, Pro y Empresarial con pago simulado, renovación automática e historial de pagos.
- Carpetas, subida y descarga de archivos, vista previa, historial de versiones y papelera.
- Control de cuota según el plan contratado.
- Compartición de archivos y carpetas por enlace, con contraseña, vencimiento y correos autorizados según el plan.
- Asistente **Box IA** para hacer preguntas sobre el contenido de los documentos.
- Panel de administración: usuarios, planes y estadísticas de ventas.

> Los pagos son simulados: no se procesa dinero real.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite |
| Base de datos | PostgreSQL (Supabase) con políticas RLS |
| Autenticación | Supabase Auth |
| Archivos | Supabase Storage (bucket privado) |
| Box IA | Supabase Edge Function + DeepSeek API |
| Despliegue | Vercel |

## Estructura del repositorio

```
client/                 Aplicación React
  src/views/            Pantallas principales
  src/components/       Componentes de la interfaz
  src/services/         Capa de servicios (auth, planes, pagos, archivos, compartición, admin, Box IA)
  src/strategies/       Patrón Strategy (papelera y tipos de archivo)
  src/factories/        Patrón Factory (usuario, archivo y carpeta)
  scripts/              Respaldo y limpieza de archivos huérfanos
supabase/
  schema.sql            Esquema completo de la base de datos
  functions/box-ia/     Edge Function del asistente Box IA
```

## Instalación local

**Requisitos:** Node.js 18 o superior y un proyecto de Supabase.

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/josuebarr10s/cloud_storage_saas.git
   cd cloud_storage_saas/client
   npm install
   ```
2. Copiar `client/.env.example` a `client/.env.local` y completar:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_clave_anon_publica
   ```
3. En Supabase, abrir el **SQL Editor** y ejecutar `supabase/schema.sql`.
4. (Opcional, para Box IA) Desplegar la Edge Function y guardar la clave de DeepSeek como secreto:
   ```bash
   supabase functions deploy box-ia
   supabase secrets set DEEPSEEK_API_KEY=tu_clave
   ```
5. Iniciar la aplicación:
   ```bash
   npm run dev
   ```

## Equipo

- Josue Emanuel Barrios Estrada
- Fernanda Abigaíl Navarro Martinez
- José Andres López Díaz
- Pablo José Lorenzo Arrivillaga
