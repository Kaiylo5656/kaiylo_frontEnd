import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrlWithApi, buildApiUrl } from '../config/api';
import { supabase } from '../lib/supabase';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage';

// Expose axios globally for testing purposes (development only)
if (import.meta.env.DEV) {
  window.axios = axios;
  console.log('🔧 Axios exposed to window for testing');
}

// Helper to read persisted Supabase session
const getStoredSupabaseSession = () => {
  try {
    const raw = safeGetItem('sb-auth-token');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('❌ Unable to parse stored Supabase session', error);
    return null;
  }
};

// Helper to persist access / refresh tokens consistently
const persistSessionTokens = (session) => {
  if (!session) return;

  const accessToken = session.access_token;
  const refreshToken = session.refresh_token;

  if (accessToken) {
    safeSetItem('authToken', accessToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  }

  if (refreshToken) {
    safeSetItem('supabaseRefreshToken', refreshToken);
  }

  // Also persist the full Supabase session in the format Supabase expects
  // This ensures Supabase can recognize the session when verifying tokens
  if (session && accessToken && refreshToken) {
    try {
      const sessionWrapper = {
        currentSession: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          token_type: session.token_type || 'bearer',
          user: session.user
        },
        expiresAt: session.expires_at
      };
      safeSetItem('sb-auth-token', JSON.stringify(sessionWrapper));
    } catch (error) {
      console.warn('Failed to persist Supabase session:', error);
    }
  }
};

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
  const isRefreshingRef = useRef(false); // Flag pour empêcher plusieurs refresh parallèles
  const refreshQueueRef = useRef([]); // File d'attente pour les requêtes en attente d'un nouveau token
  const refreshFailureCountRef = useRef(0); // Compteur d'échecs de refresh consécutifs
  const MAX_REFRESH_FAILURES = 3; // Nombre maximum d'échecs de refresh consécutifs avant déconnexion forcée

  // Gestion centralisée de la file d'attente de refresh (résout ou rejette toutes les promesses en attente)
  const resolveRefreshQueue = useCallback((errorValue, tokenValue) => {
    refreshQueueRef.current.forEach(({ resolve, reject }) => {
      if (errorValue) {
        reject(errorValue);
      } else {
        resolve(tokenValue);
      }
    });
    refreshQueueRef.current = [];
  }, []);

  // Get API base URL dynamically
  const API_BASE_URL = getApiBaseUrlWithApi();

  // Logout function (optimized with useCallback)
  const logout = useCallback((skipSignOut = false) => {
    // Éviter les appels multiples
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    safeRemoveItem('authToken');
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem('authToken');
      } catch (e) {
        // Ignore sessionStorage errors
      }
    }
    safeRemoveItem('supabaseRefreshToken');
    // Ensure the main Supabase persistance token is also removed
    safeRemoveItem('sb-auth-token');
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('sb-auth-token');
      } catch (e) {
        // Ignore localStorage errors
      }
    }
    
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setError(null);
    // Rejeter les promesses en attente de refresh (utile si on se déconnecte pendant un refresh)
    resolveRefreshQueue(new Error('User logged out'), null);
    
    // Ne pas appeler signOut() si on est déjà déconnecté (évite la boucle)
    if (!skipSignOut) {
      // Use await if possible, but since logout is not async in signature (to be safe with UI),
      // we just fire and forget, but we CLEARED local tokens first so UI is safe.
      supabase.auth.signOut().catch(err => console.error('SignOut error:', err)).finally(() => {
        isLoggingOutRef.current = false;
      });
    } else {
      isLoggingOutRef.current = false;
    }
    
    // Naviguer seulement si on n'est pas déjà sur la page de login
    if (typeof navigate === 'function' && window.location.pathname !== '/login') {
      navigate('/login');
    }
  }, [navigate, resolveRefreshQueue]);

  // Refresh auth token function (optimized with refreshSession)
  const refreshAuthToken = useCallback(async () => {
    // Si un refresh est déjà en cours, mettre la requête dans la file d'attente
    if (isRefreshingRef.current) {
      return new Promise((resolve, reject) => {
        refreshQueueRef.current.push({ resolve, reject });
      });
    }

    isRefreshingRef.current = true;

    try {
      console.log('🔄 Attempting to refresh auth token...');

      // 1) Tenter de récupérer la session active via Supabase
      let {
        data: { session: activeSession },
        error: getSessionError
      } = await supabase.auth.getSession();

      if (getSessionError) {
        console.warn('⚠️ getSession error:', getSessionError.message);
      }

      // 2) Fallback : réhydrater depuis la session persistée (sb-auth-token)
      if (!activeSession || !activeSession.access_token) {
        const storedSessionWrapper = getStoredSupabaseSession();
        const storedSession = storedSessionWrapper?.currentSession;
        const storedRefreshToken =
          storedSession?.refresh_token || safeGetItem('supabaseRefreshToken');

        // Only try setSession if we have BOTH access_token AND refresh_token
        // If we only have refresh_token, skip to refreshSession (step 3)
        if (storedSession?.access_token && storedRefreshToken) {
          console.log('🔄 Rehydrating Supabase session from stored tokens');
          const { data, error } = await supabase.auth.setSession({
            access_token: storedSession.access_token,
            refresh_token: storedRefreshToken
          });

          if (error) {
            console.error('❌ setSession failed:', error.message);
            // If setSession fails, clear activeSession to force refreshSession
            activeSession = null;
          } else {
            activeSession = data?.session;
          }
        } else if (storedRefreshToken) {
          // We have refresh token but no access token - skip to refreshSession
          console.log('🔄 No access token found, will use refreshSession');
          activeSession = null; // Force to try refreshSession in step 3
        }
      }

      // 3) Ultime fallback : refresh forcé avec le refresh token persistant
      if (!activeSession || !activeSession.access_token) {
        const storedRefreshToken = safeGetItem('supabaseRefreshToken');
        if (storedRefreshToken) {
          try {
            const { data, error } = await supabase.auth.refreshSession({
              refresh_token: storedRefreshToken
            });
            if (error) {
              // Si le refresh token est invalide, nettoyer et arrêter
              if (error.message?.includes('Invalid Refresh Token') || 
                  error.message?.includes('Refresh Token Not Found') ||
                  error.message?.includes('Already Used')) {
                console.log('ℹ️ Refresh token invalid or already used, cleaning up...');
                console.log('🔄 Error details:', error.message);
                
                // Nettoyer tous les tokens
                safeRemoveItem('supabaseRefreshToken');
                safeRemoveItem('authToken');
                safeRemoveItem('sb-auth-token');
                localStorage.removeItem('sb-auth-token'); // Double cleanup
                
                throw new Error('Refresh token invalid or already used');
              }
              console.error('❌ refreshSession failed:', error.message);
              throw error;
            }
            activeSession = data?.session;
          } catch (refreshError) {
            // Si le refresh échoue, nettoyer les tokens et arrêter
            if (refreshError.message?.includes('Refresh token invalid') ||
                refreshError.message?.includes('Invalid Refresh Token') ||
                refreshError.message?.includes('Refresh Token Not Found') ||
                refreshError.message?.includes('Already Used')) {
              console.log('🚨 Refresh token is invalid or already used');
              safeRemoveItem('supabaseRefreshToken');
              safeRemoveItem('authToken');
              safeRemoveItem('sb-auth-token');
              localStorage.removeItem('sb-auth-token'); // Double cleanup
              throw refreshError;
            }
            throw refreshError;
          }
        }
      }

      if (!activeSession || !activeSession.access_token) {
        throw new Error('No active session available after refresh attempt');
      }

      persistSessionTokens(activeSession);

      // Update axios default headers with new token
      axios.defaults.headers.common['Authorization'] = `Bearer ${activeSession.access_token}`;

      console.log('✅ Token refreshed successfully');
      refreshFailureCountRef.current = 0; // Réinitialiser le compteur en cas de succès
      resolveRefreshQueue(null, activeSession.access_token);
      return activeSession.access_token;
    } catch (error) {
      console.error('❌ Failed to refresh token:', error);
      refreshFailureCountRef.current += 1; // Incrémenter le compteur d'échecs
      resolveRefreshQueue(error, null);
      
      // If refresh token is invalid, we MUST log out the user locally
      // otherwise they are stuck in a loop of failed refreshes
      if (error.message && (
          error.message.includes('Refresh token invalid') || 
          error.message.includes('Invalid Refresh Token') ||
          error.message.includes('Refresh Token Not Found') ||
          error.message.includes('Already Used'))) {
          console.log('🔒 Refresh token invalid or already used, forcing logout...');
          refreshFailureCountRef.current = 0; // Reset counter before logout
          logout(true); // skipSignOut=true because session is likely gone
      } else if (refreshFailureCountRef.current >= MAX_REFRESH_FAILURES) {
          // Trop d'échecs consécutifs : forcer la déconnexion pour éviter les boucles infinies
          console.error(`🔒 Too many refresh failures (${refreshFailureCountRef.current}), forcing logout to prevent infinite loop...`);
          refreshFailureCountRef.current = 0; // Reset counter before logout
          logout(true); // skipSignOut=true to avoid recursive calls
      } else {
          // Just clean up tokens for other errors
          console.warn(`⚠️ Refresh failed (${refreshFailureCountRef.current}/${MAX_REFRESH_FAILURES}). Will retry on next attempt.`);
          safeRemoveItem('authToken');
          safeRemoveItem('supabaseRefreshToken');
          delete axios.defaults.headers.common['Authorization'];
      }
      return null;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [logout, resolveRefreshQueue]);

  // Set up Axios interceptor for handling 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config || {};
        
        // Ne pas intercepter les erreurs 401 pour /auth/me ou /auth/login pour éviter les boucles
        const isAuthEndpoint = originalRequest.url?.includes('/auth/me') || 
                               originalRequest.url?.includes('/auth/login');
        
        if (error.response && error.response.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
          // Vérifier si on a déjà atteint le maximum d'échecs
          if (refreshFailureCountRef.current >= MAX_REFRESH_FAILURES) {
            console.error('🚨 Too many authentication failures. Request rejected to prevent infinite loop.');
            return Promise.reject(error);
          }

          console.warn('🚨 Interceptor: Caught 401 Unauthorized. Attempting token refresh...');
          originalRequest._retry = true;
          const newToken = await refreshAuthToken();
          if (newToken) {
            console.log('✅ Token refreshed, retrying original request...');
            originalRequest.headers = {
              ...(originalRequest.headers || {}),
              Authorization: `Bearer ${newToken}`
            };
            // Réessayer la requête avec le nouveau token
            try {
              const retryResponse = await axios(originalRequest);
              // Si la requête réussit, réinitialiser le compteur
              if (retryResponse && retryResponse.status < 400) {
                refreshFailureCountRef.current = 0;
              }
              return retryResponse;
            } catch (retryError) {
              // Si la requête échoue encore, le compteur sera incrémenté au prochain refresh
              throw retryError;
            }
          }
          console.warn('❌ Refresh failed or no session. Not retrying.');
          // Ne pas appeler logout() ici, refreshAuthToken gère déjà la déconnexion après plusieurs échecs
          return Promise.reject(error);
        }
        return Promise.reject(error);
      }
    );

    // Clean up the interceptor when the component unmounts
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [refreshAuthToken]);

  // Function to check if user is already authenticated (optimized with timeout)
  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      
      // Vérifier d'abord localStorage (plus rapide et fiable)
      const token = safeGetItem('authToken');
      
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
          safeRemoveItem('authToken');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      
      // Check if we have any auth-related data in storage before calling Supabase
      // This avoids unnecessary timeout if user is not logged in
      const hasAuthData = safeGetItem('authToken') || 
                         safeGetItem('supabaseRefreshToken') || 
                         safeGetItem('sb-auth-token');
      
      if (!hasAuthData) {
        // No auth data in storage, user is likely not logged in
        // Skip Supabase check to avoid timeout
        console.log('ℹ️ No auth data in storage, skipping Supabase check');
        setUser(null);
        return;
      }
      
      // Essayer Supabase uniquement si on a des données d'auth en storage
      // Cela évite le timeout quand l'utilisateur n'est pas connecté
      try {
        console.log('🔄 Auth data found in storage, checking Supabase session...');
        
        // Essayer Supabase avec un timeout très court
        // Si ça timeout, on considère que l'utilisateur n'est pas connecté
        let session = null;
        let sessionError = null;
        
        try {
          // Utiliser Promise.race avec un timeout de 2 secondes
          const sessionResult = await Promise.race([
            supabase.auth.getSession(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session check timeout')), 2000) // 2 secondes
            )
          ]);
          
          session = sessionResult?.data?.session || null;
          sessionError = sessionResult?.error || null;
          
          if (session && session.access_token) {
            // Session valide trouvée
          } else if (!session && !sessionError) {
            // Pas de session mais pas d'erreur non plus
            console.log('ℹ️ No session found in Supabase');
          }
        } catch (error) {
          // Timeout - considérer que l'utilisateur n'est pas connecté
          // Nettoyer le storage pour éviter les futurs timeouts
          if (error.message === 'Session check timeout') {
            console.log('⏱️ Supabase session check timeout - clearing auth data');
            safeRemoveItem('authToken');
            safeRemoveItem('supabaseRefreshToken');
            safeRemoveItem('sb-auth-token');
            delete axios.defaults.headers.common['Authorization'];
          }
          // Ne pas traiter comme une erreur critique
          session = null;
          sessionError = null;
        }
        
        if (session && !sessionError && session.access_token) {
          // Session Supabase valide
          persistSessionTokens(session);
          
          // Vérifier que le token est bien dans les headers axios
          if (!axios.defaults.headers.common['Authorization']) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
          }
          
          // Récupérer les infos utilisateur depuis le backend
          try {
            const response = await axios.get(`${getApiBaseUrlWithApi()}/auth/me`, {
              timeout: 5000, // Augmenter le timeout pour la première vérification
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            });
            setUser(response.data.user);
            console.log('✅ Auth check successful via Supabase session');
            return; // Succès, on sort
          } catch (error) {
            console.error('❌ Error fetching user from backend:', {
              status: error.response?.status,
              message: error.response?.data?.error || error.message,
              tokenLength: session.access_token?.length
            });
            
            // Si le backend retourne 401, le token Supabase est invalide
            if (error.response?.status === 401) {
              console.error('❌ Backend rejected token (401). Clearing session to prevent loop.');
              
              // Token invalide, on doit déconnecter l'utilisateur
              safeRemoveItem('authToken');
              safeRemoveItem('supabaseRefreshToken');
              // On nettoie aussi le wrapper de session complet
              safeRemoveItem('sb-auth-token');
              if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('sb-auth-token');
              }
              
              delete axios.defaults.headers.common['Authorization'];
              setUser(null);
              return; 
            } else {
              // Si le backend échoue pour une autre raison (timeout, réseau, etc.)
              console.error('Backend request failed (non-401):', error.message);
              // Utiliser les infos de la session Supabase comme fallback
              setUser({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || 'User',
                role: session.user.user_metadata?.role || 'student'
              });
              console.log('✅ Using Supabase user metadata as fallback due to backend error');
              return; // Succès avec infos Supabase
            }
          }
        }
        
        // Pas de session valide, on est déconnecté
        console.log('ℹ️ No valid session found');
        // Nettoyer les tokens invalides
        safeRemoveItem('authToken');
        safeRemoveItem('supabaseRefreshToken');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
      } catch (error) {
        // Ignorer les erreurs de refresh token invalide (c'est normal si l'utilisateur est déconnecté)
        if (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found')) {
          console.log('ℹ️ Refresh token invalid (user logged out), cleaning up...');
        } else {
          console.warn('⚠️ Supabase check failed:', error.message);
        }
        // Nettoyer les tokens invalides
        safeRemoveItem('authToken');
        safeRemoveItem('supabaseRefreshToken');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      safeRemoveItem('authToken');
      safeRemoveItem('supabaseRefreshToken');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
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
    // Écouter SEULEMENT les événements SIGNED_IN et TOKEN_REFRESHED
    // On ignore complètement SIGNED_OUT et INITIAL_SESSION car on gère la déconnexion manuellement
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignorer INITIAL_SESSION
        if (event === 'INITIAL_SESSION') {
          return;
        }

        // Handle SIGNED_OUT for multi-tab synchronization
        if (event === 'SIGNED_OUT') {
           console.log('🔄 Auth state changed: SIGNED_OUT');
           // Si ce n'est pas nous qui avons initié la déconnexion (isLoggingOutRef est false),
           // alors ça vient d'un autre onglet -> on doit se déconnecter localement
           if (!isLoggingOutRef.current) {
             console.log('🔄 Detected logout from another source, syncing local state...');
             logout(true); // skipSignOut=true car déjà déconnecté côté Supabase
           }
           return;
        }

        // Handle PASSWORD_RECOVERY event specifically
        if (event === 'PASSWORD_RECOVERY') {
          console.log('🔄 Auth state changed: PASSWORD_RECOVERY');
          // Treat PASSWORD_RECOVERY exactly like SIGNED_IN to ensure user state is updated
          // This is crucial for the ResetPasswordPage to detect the authenticated session
        }
        
        // Ignorer si on est déjà en train de traiter un événement
        if (isProcessing) {
          return;
        }
        
        isProcessing = true;
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        
        try {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY') {
            if (session) {
              console.log('✅ Supabase auto-refresh completed, persisting new tokens...');
              // Synchroniser le token avec localStorage et axios
              persistSessionTokens(session);
              
              // Si un refresh manuel est en cours, le résoudre avec le nouveau token
              if (isRefreshingRef.current) {
                console.log('🔄 Manual refresh in progress, resolving with Supabase token');
                resolveRefreshQueue(null, session.access_token);
                isRefreshingRef.current = false;
              }
              
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

  // Rafraîchir proactivement la session pour éviter l'expiration inattendue
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAuthToken().catch(() => {});
    }, 15 * 60 * 1000); // toutes les 15 minutes

    return () => clearInterval(interval);
  }, [refreshAuthToken]);

  // Login function (optimized - synchronise avec Supabase)
  const login = async (email, password, navigate, redirectPath = null) => {
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
      const { token, refreshToken, user } = response.data;
      
      // Synchroniser avec Supabase pour bénéficier de la gestion automatique
      let session = null;
      const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (existingSession && !sessionError) {
        session = existingSession;
        console.log('🔐 Existing Supabase session detected');
      }

      if (!session && token && refreshToken) {
        console.log('🔐 No Supabase session found, setting session manually');
        const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
          access_token: token,
          refresh_token: refreshToken
        });

        if (setSessionError) {
          console.error('❌ supabase.auth.setSession failed:', setSessionError.message);
        } else {
          session = setSessionData?.session || null;
        }
      }

      if (session) {
        // Utiliser la session Supabase (plus fiable, inclut refresh token)
        persistSessionTokens(session);
        console.log('🔐 Supabase session established');
      } else if (token) {
        // Dernier recours: utiliser uniquement le token du backend pour ne pas bloquer l'utilisateur
        safeSetItem('authToken', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.warn('⚠️ Supabase session not available, falling back to access token only');
      } else {
        throw new Error('No access token returned from login response');
      }
      
      // Update user state
      setUser(user);
      console.log('🔐 User state updated:', user?.email);
      
      // Navigate based on user role and onboarding completion
      let targetPath;
      
      if (redirectPath) {
        targetPath = redirectPath;
      } else {
        if (user.role === 'student') {
          // Check if onboarding is completed
          const onboardingCompleted = user.onboardingCompleted !== false; // Default to true if not specified
          targetPath = onboardingCompleted ? '/student/dashboard' : '/onboarding';
        } else {
          targetPath = user.role === 'admin' ? '/admin/dashboard' 
          : user.role === 'coach' ? '/coach/dashboard'
          : '/dashboard';
        }
      }
      
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
      
      // Check if email confirmation is required
      if (response.data.success && response.data.requiresEmailConfirmation) {
        // Account created but email confirmation required
        const userEmail = response.data.user?.email || userData.email;
        if (navigate) {
          navigate(`/registration/success?email=${encodeURIComponent(userEmail)}`);
        }
        return { success: true, requiresEmailConfirmation: true };
      }
      
      // Check if the response has the expected structure
      if (response.data.success && response.data.token && response.data.user) {
        const { token, refreshToken, user } = response.data;
        
        // Synchroniser avec Supabase pour bénéficier de la gestion automatique
        let session = null;
        const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (existingSession && !sessionError) {
          session = existingSession;
        }

        if (!session && token && refreshToken) {
          const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: refreshToken
          });

          if (setSessionError) {
            console.error('❌ supabase.auth.setSession failed during register:', setSessionError.message);
          } else {
            session = setSessionData?.session || null;
          }
        }

        if (session) {
          // Utiliser la session Supabase (plus fiable)
          persistSessionTokens(session);
        } else if (token) {
          // Fallback: utiliser le token du backend
          safeSetItem('authToken', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
          throw new Error('No access token returned from register response');
        }
        
        // Update user state
        setUser(user);
        
        // Navigate based on user role
        switch (user.role) {
          case 'coach':
            navigate('/coach/dashboard');
            break;
          case 'student':
            navigate('/onboarding');
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
    let token = safeGetItem('authToken');
    
    // If not in localStorage, try sessionStorage
    if (!token) {
      token = sessionStorage.getItem('authToken');
    }
    
    // If still not found, try to get from axios defaults
    if (!token && axios.defaults.headers.common['Authorization']) {
      token = axios.defaults.headers.common['Authorization'].replace('Bearer ', '');
    }
    
    // If no token found, try to refresh from Supabase
    if (!token) {
      try {
        // First, try to get session directly from Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (session && session.access_token && !sessionError) {
          console.log('✅ Found Supabase session, using its token');
          persistSessionTokens(session);
          token = session.access_token;
        } else {
          // Fallback to refresh
          token = await refreshAuthToken();
        }
      } catch (error) {
        console.error('❌ Could not get or refresh token:', error);
        return null;
      }
    } else {
      // Check if token is expired or about to expire (within 30 seconds)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiration = payload.exp * 1000;
        const now = Date.now();
        
        // Only refresh if token is actually expired or about to expire
        if (expiration && now > expiration - 30000) {
          console.log('🔄 Token expired or about to expire, refreshing...');
          try {
            token = await refreshAuthToken();
          } catch (error) {
            console.warn('⚠️ Failed to refresh expired token, but token might still be valid:', error.message);
            // Don't return null immediately - the token might still work for a few seconds
            // Return the existing token and let the API call fail if it's really expired
          }
        }
      } catch (e) {
        // Token format invalid - might be a Supabase token with different format
        // Try to verify by checking if we have a Supabase session
        console.warn('⚠️ Could not parse token format, checking Supabase session...');
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (session && session.access_token && !sessionError) {
            console.log('✅ Found valid Supabase session, updating token');
            persistSessionTokens(session);
            token = session.access_token;
          } else {
            // Token format is invalid and no Supabase session - try refresh
            token = await refreshAuthToken();
          }
        } catch (error) {
          console.error('❌ Could not verify token with Supabase:', error);
          // Return the existing token anyway - it might still work
        }
      }
    }
    
    return token;
  };

  // Login with Google function
  const signInWithGoogle = async (navigate) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔐 Starting Google sign-in...');
      
      // Get the current origin for redirect URL
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      // Debug: Check storage before OAuth
      console.log('🔍 Storage check before OAuth:');
      try {
        if (typeof window !== 'undefined') {
          console.log('  - sessionStorage available:', !!window.sessionStorage);
          console.log('  - localStorage available:', !!window.localStorage);
          
          // Log all sessionStorage keys (for debugging PKCE)
          if (window.sessionStorage) {
            const sessionKeys = [];
            for (let i = 0; i < window.sessionStorage.length; i++) {
              const key = window.sessionStorage.key(i);
              if (key && (key.includes('auth') || key.includes('supabase') || key.includes('pkce'))) {
                sessionKeys.push(key);
              }
            }
            console.log('  - Relevant sessionStorage keys:', sessionKeys);
          }
        }
      } catch (e) {
        console.warn('  - Error checking storage:', e);
      }
      
      // Initiate Google OAuth flow through Supabase
      // With PKCE, Supabase will automatically generate and store the code verifier
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        console.error('❌ Google sign-in error:', error);
        setError(error.message || 'Erreur lors de la connexion Google');
        setLoading(false);
        return { success: false, error: error.message };
      }

      // Debug: Check if code verifier was stored after OAuth initiation
      console.log('🔍 Storage check after OAuth initiation:');
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const sessionKeys = [];
          for (let i = 0; i < window.sessionStorage.length; i++) {
            const key = window.sessionStorage.key(i);
            if (key && (key.includes('auth') || key.includes('supabase') || key.includes('pkce') || key.includes('code'))) {
              sessionKeys.push(key);
            }
          }
          console.log('  - Relevant sessionStorage keys after OAuth:', sessionKeys);
          if (sessionKeys.length === 0) {
            console.warn('  ⚠️ WARNING: No PKCE-related keys found in sessionStorage!');
            console.warn('  ⚠️ This may cause "code verifier not found" error in callback');
          }
        }
      } catch (e) {
        console.warn('  - Error checking storage after OAuth:', e);
      }

      // Note: The actual redirect will happen, so we don't need to handle navigation here
      // The callback URL will handle the rest
      console.log('✅ Google sign-in initiated, redirecting to:', redirectUrl);
      console.log('📝 OAuth URL:', data?.url || 'No URL returned');
      
      // Don't set loading to false here because we're redirecting
      return { success: true };
    } catch (error) {
      console.error('❌ Google sign-in exception:', error);
      const errorMessage = error.message || 'Erreur lors de la connexion Google';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  // Reset password for email
  const resetPasswordForEmail = async (email, redirectTo) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Update password (for logged in user)
  const updatePassword = async (newPassword) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
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
    refreshAuthToken,
    signInWithGoogle,
    resetPasswordForEmail,
    updatePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
