import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // This will help detect missing envs during development.
  console.warn('Supabase env vars are not set. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

const isBrowser = typeof window !== 'undefined';

const authOptions = isBrowser
  ? {
      storage: AsyncStorage as any,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    }
  : {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    };

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: authOptions,
});
