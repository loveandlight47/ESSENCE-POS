import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://ipgexqoxkyxdssahhkjm.supabase.co/rest/v1/";

const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZ2V4cW94a3l4ZHNzYWhoa2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MzQ1MDEsImV4cCI6MjEwODUxMDUwMX0.A758e4kwIG8lo6rsXuYKHHB-dIjVEaZU7wImhu_mVXo";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
