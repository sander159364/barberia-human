import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan las variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. " +
      "Revisa que exista el archivo .env en la raíz del proyecto (mismo nivel que package.json), " +
      "que no tenga espacios ni comillas, y reinicia 'npm run dev' después de crearlo/editarlo."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);