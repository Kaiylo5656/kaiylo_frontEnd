import { createClient } from '@supabase/supabase-js';
import { getSafeStorage } from '../utils/storage';

// Initialize Supabase client with singleton pattern to avoid multiple instances
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables are not defined!');
  console.error('Please create a .env file in the frontend directory with:');
  console.error('VITE_SUPABASE_URL=your-supabase-url');
  console.error('VITE_SUPABASE_ANON_KEY=your-supabase-anon-key');
}

// Singleton pattern: s'assurer qu'il n'y a qu'une seule instance Supabase
// Cela évite les problèmes de "Multiple GoTrueClient instances" en mode développement
let supabaseInstance = null;

const getSupabaseClient = () => {
  // Si une instance existe déjà dans window, la réutiliser (évite les re-créations en HMR)
  if (typeof window !== 'undefined' && window.__SUPABASE_CLIENT__) {
    return window.__SUPABASE_CLIENT__;
  }
  
  // Si une instance existe déjà en mémoire, la réutiliser
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  // Créer une nouvelle instance
  supabaseInstance = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        persistSession: true,              // ✅ Persiste la session automatiquement
        autoRefreshToken: true,            // ✅ Refresh automatique des tokens
        detectSessionInUrl: false,         // ✅ Pas de détection d'URL (on utilise le backend)
        storage: getSafeStorage(),         // ✅ Utilise storage sécurisé
        storageKey: 'sb-auth-token',       // ✅ Clé personnalisée pour éviter les conflits
        flowType: 'pkce'                   // ✅ Utilise PKCE flow (plus sécurisé)
      },
      global: {
        headers: {
          'x-client-info': 'kaiylo-app'
        }
      }
    }
  );
  
  // Stocker dans window pour éviter les re-créations en HMR
  if (typeof window !== 'undefined') {
    window.__SUPABASE_CLIENT__ = supabaseInstance;
  }
  
  return supabaseInstance;
};

export const supabase = getSupabaseClient();

