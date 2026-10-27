import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";

const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "PASTE_YOUR_SUPABASE_PUBLIC_KEY_HERE";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
