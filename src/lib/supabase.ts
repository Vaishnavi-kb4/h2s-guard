import { createClient } from "@supabase/supabase-js";

const env = import.meta.env as Record<string, string | undefined>;
const supabaseUrl = env["VITE_SUPABASE_URL"] || "";
const supabaseAnonKey = env["VITE_SUPABASE_ANON_KEY"] || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
