import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrlWithApi, buildApiUrl } from '../config/api';
import { createClient } from '@supabase/supabase-js';

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
        storage: window.localStorage,      // ✅ Utilise localStorage
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

const supabase = getSupabaseClient();

// Create the authentication context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  // State for user authentication
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isLoggingOutRef = useRef(false); // Flag pour éviter les boucles
  const authInitializedRef = useRef(false); // Flag pour ignorer le premier SIGNED_OUT au démarrage

  // Get API base URL dynamically
  const API_BASE_URL = getApiBaseUrlWithApi();

  // Logout function (optimized with useCallback)
  const logout = useCallback((skipSignOut = false) => {
    // Éviter les appels multiples
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setError(null);
    
    // Ne pas appeler signOut() si on est déjà déconnecté (évite la boucle)
    if (!skipSignOut) {
      supabase.auth.signOut().finally(() => {
        isLoggingOutRef.current = false;
      });
    } else {
      isLoggingOutRef.current = false;
    }
    
    // Naviguer seulement si on n'est pas déjà sur la page de login
    if (typeof navigate === 'function' && window.location.pathname !== '/login') {
      navigate('/login');
    }
  }, [navigate]);

  // Refresh auth token function (optimized with refreshSession)
  const refreshAuthToken = useCallback(async () => {
    try {
      console.log('🔄 Attempting to refresh auth token...');
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('❌ Supabase not configured, cannot refresh token');
        throw new Error('Supabase not configured');
      }
      
      // Utiliser refreshSession() qui est plus efficace que getSession()
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error || !session) {
        console.log('❌ No active session or refresh failed');
        logout();
        return null;
      }
      
      // Synchroniser avec localStorage et axios
      localStorage.setItem('authToken', session.access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
      
      console.log('✅ Token refreshed successfully');
      return session.access_token;
    } catch (error) {
      console.error('❌ Failed to refresh token:', error);
      logout();
      return null;
    }
  }, [logout]);

  // Set up Axios interceptor for handling 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config || {};
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
          console.warn('🚨 Interceptor: Caught 401 Unauthorized. Attempting token refresh...');
          originalRequest._retry = true;
          const newToken = await refreshAuthToken();
          if (newToken) {
            console.log('✅ Token refreshed, retrying original request...');
            originalRequest.headers = {
              ...(originalRequest.headers || {}),
              Authorization: `Bearer ${newToken}`
            };
            return axios(originalRequest);
          }
          console.warn('❌ Refresh failed or no session. Not retrying. Logging out.');
          return Promise.reject(error);
        }
        return Promise.reject(error);
      }
    );

    // Clean up the interceptor when the component unmounts
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [refreshAuthToken, logout]);

  // Function to check if user is already authenticated (optimized with timeout)
  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      
      // Nettoyer d'abord les données Supabase potentiellement corrompues
      try {
        const supabaseKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-') && key.includes('auth-token')) {
            supabaseKeys.push(key);
          }
        }
        // Si on a des clés Supabase mais pas de token valide, les nettoyer
        if (supabaseKeys.length > 0 && !localStorage.getItem('authToken')) {
          supabaseKeys.forEach(key => localStorage.removeItem(key));
          console.log('🧹 Cleaned up Supabase storage keys');
        }
      } catch (error) {
        console.error('Error cleaning Supabase storage:', error);
      }
      
      // Vérifier d'abord localStorage (plus rapide et fiable)
      const token = localStorage.getItem('authToken');
      
      if (token) {
        // Token trouvé dans localStorage, vérifier avec le backend
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const response = await axios.get(`${getApiBaseUrlWithApi()}/auth/me`, {
            timeout: 3000 // Timeout de 3 secondes
          });
          setUser(response.data.user);
          console.log('✅ Auth check successful via localStorage token');
          return; // Succès, on sort
        } catch (error) {
          console.warn('⚠️ Token in localStorage invalid, checking Supabase session...');
          // Token invalide, nettoyer et vérifier Supabase
          localStorage.removeItem('authToken');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      
      // Essayer Supabase avec timeout (peut être bloqué)
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 2000)
        );
        
        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]).catch(() => {
          // Timeout ou erreur, on ignore Supabase
          console.warn('⚠️ Supabase session check timed out or failed, skipping');
          return { data: { session: null }, error: { message: 'Timeout' } };
        });
        
        if (session && !sessionError) {
          // Session Supabase valide
          localStorage.setItem('authToken', session.access_token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
          
          // Récupérer les infos utilisateur depuis le backend
          try {
            const response = await axios.get(`${getApiBaseUrlWithApi()}/auth/me`, {
              timeout: 3000
            });
            setUser(response.data.user);
            console.log('✅ Auth check successful via Supabase session');
          } catch (error) {
            console.error('Failed to get user info from backend:', error);
            // Si le backend échoue, utiliser les infos de la session Supabase
            setUser({
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.name || 'User',
              role: session.user.user_metadata?.role || 'coach'
            });
          }
        } else {
          // Pas de session valide, on est déconnecté
          console.log('ℹ️ No valid session found');
        }
      } catch (error) {
        console.warn('⚠️ Supabase check failed:', error.message);
        // Ignorer l'erreur, on continue
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
      console.log('✅ Auth check completed');
    }
  };

  // Check if user is already logged in on app start
  useEffect(() => {
    let isMounted = true;
    
    // S'assurer que loading est false après un court délai si checkAuthStatus échoue silencieusement
    const loadingSafetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('⚠️ Loading still true after 5 seconds, forcing to false');
        setLoading(false);
      }
    }, 5000);
    
    checkAuthStatus().finally(() => {
      if (isMounted) {
        clearTimeout(loadingSafetyTimeout);
      }
    });
    
    return () => {
      isMounted = false;
      clearTimeout(loadingSafetyTimeout);
    };
  }, []);

  // Listen to auth state changes from Supabase (optimized - ignore SIGNED_OUT completely)
  useEffect(() => {
    let isProcessing = false; // Flag pour éviter les appels multiples simultanés
    
    // Nettoyer les données Supabase corrompues au démarrage
    const cleanupSupabaseStorage = () => {
      try {
        // Nettoyer toutes les clés Supabase qui pourraient causer des problèmes
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-') && key.includes('auth-token')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => {
          console.log('🧹 Cleaning up Supabase storage key:', key);
          localStorage.removeItem(key);
        });
      } catch (error) {
        console.error('Error cleaning Supabase storage:', error);
      }
    };
    
    // Nettoyer au démarrage si on n'a pas de session valide
    if (!localStorage.getItem('authToken')) {
      cleanupSupabaseStorage();
    }
    
    // Écouter SEULEMENT les événements SIGNED_IN et TOKEN_REFRESHED
    // On ignore complètement SIGNED_OUT et INITIAL_SESSION car on gère la déconnexion manuellement
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignorer complètement les événements SIGNED_OUT et INITIAL_SESSION (on les gère manuellement)
        if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
          return;
        }
        
        // Ignorer si on est déjà en train de traiter un événement
        if (isProcessing) {
          return;
        }
        
        isProcessing = true;
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        
        try {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session) {
              // Synchroniser le token avec localStorage et axios
              localStorage.setItem('authToken', session.access_token);
              axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
              
              // Mettre à jour l'état utilisateur
              try {
                const response = await axios.get(`${getApiBaseUrlWithApi()}/auth/me`);
                setUser(response.data.user);
              } catch (error) {
                // Si le backend échoue, utiliser les infos de la session Supabase
                setUser({
                  id: session.user.id,
                  email: session.user.email,
                  name: session.user.user_metadata?.name || 'User',
                  role: session.user.user_metadata?.role || 'coach'
                });
              }
            }
          }
        } finally {
          // Réinitialiser le flag après un délai
          setTimeout(() => {
            isProcessing = false;
          }, 300);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Login function (optimized - synchronise avec Supabase)
  const login = async (email, password, navigate) => {
    // Timeout de sécurité pour forcer le loading à false après 30 secondes
    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Login timeout - forcing loading to false');
      setLoading(false);
    }, 30000);
    
    try {
      setLoading(true);
      setError(null);
      
      const loginUrl = `${getApiBaseUrlWithApi()}/auth/login`;
      console.log('🔐 Login attempt to URL:', loginUrl);
      
      const response = await axios.post(loginUrl, {
        email,
        password
      });

      console.log('🔐 Login response received:', response.status);
      const { token, user } = response.data;
      
      // Synchroniser avec Supabase pour bénéficier de la gestion automatique
      // Le backend a déjà créé la session, on la récupère depuis Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (session && !sessionError) {
        // Utiliser la session Supabase (plus fiable)
        localStorage.setItem('authToken', session.access_token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
        console.log('🔐 Using Supabase session token');
      } else {
        // Fallback: utiliser le token du backend
        localStorage.setItem('authToken', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('🔐 Using backend token');
      }
      
      // Update user state
      setUser(user);
      console.log('🔐 User state updated:', user?.email);
      
      // Navigate based on user role
      const targetPath = user.role === 'admin' ? '/admin/dashboard' 
        : user.role === 'coach' ? '/coach/dashboard'
        : user.role === 'student' ? '/student/dashboard'
        : '/dashboard';
      
      console.log('🔐 Navigating to:', targetPath);
      navigate(targetPath);

      clearTimeout(loadingTimeout);
      return { success: true };
    } catch (error) {
      console.error('🔐 Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      setError(errorMessage);
      clearTimeout(loadingTimeout);
      return { success: false, error: errorMessage };
    } finally {
      clearTimeout(loadingTimeout);
      console.log('🔐 Login finally - setting loading to false');
      setLoading(false);
    }
  };

  // Register function (updated to handle invitations)
  const register = async (userData, navigate) => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      
      if (userData.role === 'student' && userData.invitationCode) {
        // Student registration with invitation
        response = await axios.post(`${getApiBaseUrlWithApi()}/invitations/accept`, {
          invitationCode: userData.invitationCode,
          name: userData.name,
          password: userData.password
        });
      } else if (userData.role === 'coach') {
        // Coach registration (direct)
        response = await axios.post(`${getApiBaseUrlWithApi()}/auth/register`, {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          role: 'coach'
        });
      } else {
        throw new Error('Invalid registration data');
      }
      
      // Check if the response has the expected structure
      if (response.data.success && response.data.token && response.data.user) {
        const { token, user } = response.data;
        
        // Synchroniser avec Supabase pour bénéficier de la gestion automatique
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session && !sessionError) {
          // Utiliser la session Supabase (plus fiable)
          localStorage.setItem('authToken', session.access_token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
        } else {
          // Fallback: utiliser le token du backend
          localStorage.setItem('authToken', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        
        // Update user state
        setUser(user);
        
        // Navigate based on user role
        switch (user.role) {
          case 'coach':
            navigate('/coach/dashboard');
            break;
          case 'student':
            navigate('/student/dashboard');
            break;
          default:
            navigate('/dashboard');
        }

        return { success: true };
      } else {
        // Handle unexpected response structure
        console.error('Unexpected response structure:', response.data);
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.put(`${getApiBaseUrlWithApi()}/auth/profile`, userData);
      
      // Update user state with new data
      setUser(response.data.user);
      
      return { success: true, user: response.data.user };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  // Check if user is admin
  const isAdmin = () => hasRole('admin');

  // Check if user is coach
  const isCoach = () => hasRole('coach');

  // Check if user is student
  const isStudent = () => hasRole('student');

  // Get auth token function with automatic refresh
  const getAuthToken = async () => {
    // Try localStorage first
    let token = localStorage.getItem('authToken');
    
    // If not in localStorage, try sessionStorage
    if (!token) {
      token = sessionStorage.getItem('authToken');
    }
    
    // If still not found, try to get from axios defaults
    if (!token && axios.defaults.headers.common['Authorization']) {
      token = axios.defaults.headers.common['Authorization'].replace('Bearer ', '');
    }
    
    // If no token found, try to refresh
    if (!token) {
      try {
        token = await refreshAuthToken();
      } catch (error) {
        console.error('❌ Could not get or refresh token:', error);
        return null;
      }
    }
    
    return token;
  };

  // Value object to provide to consumers
  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    hasRole,
    hasAnyRole,
    isAdmin,
    isCoach,
    isStudent,
    checkAuthStatus,
    getAuthToken,
    refreshAuthToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
