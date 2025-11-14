import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration is missing. Please check your .env file.');
    }

    supabaseInstance = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }

  return supabaseInstance;
}
