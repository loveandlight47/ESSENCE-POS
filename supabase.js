import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://ipgexqoxkyxdssahhkjm.supabase.co";

const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_20iHe1HINY6s-yxcfb1lcw_88vakvmF";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
