import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or Key is missing. Check your environment variables.');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

/**
 * Common types for the Supabase database
 */
export type Conversion = {
  id: string;
  uid: string;
  type: 'image' | 'audio' | 'video' | 'document';
  input_format: string;
  output_format: string;
  input_size: number;
  output_size: number;
  created_at: string;
  status: string;
  file_name: string;
  file_url?: string;
};
