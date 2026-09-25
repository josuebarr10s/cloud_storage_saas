import { createClient } from '@supabase/supabase-js';

// Importamos las variables de entorno usando la sintaxis de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validación de seguridad para evitar errores si a un compañero le falta el .env
if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ Faltan las variables de entorno de Supabase. Revisa tu archivo .env");
}

// Inicializamos y exportamos el cliente
export const supabase = createClient(supabaseUrl, supabaseKey);