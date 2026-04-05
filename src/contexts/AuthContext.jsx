import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrlWithApi, buildApiUrl } from '../config/api';
import { supabase } from '../lib/supabase';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage';
import { isDesktopViewport } from '../utils/device';
import { clearAllChatCache } from '../utils/chatCache';
import logger from '../utils/logger';

// Expose axios globally for testing purposes (development only)
if (import.meta.env.DEV) {
  window.axios = axios;
  logger.debug('🔧 Axios exposed to window for testing');
}

// Helper to read persisted Supabase session
const getStoredSupabaseSession = () => {
  try {
    const raw = safeGetItem('sb-auth-token');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    logger.error('❌ Unable to parse stored Supabase session', error);
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
      logger.warn('Failed to persist Supabase session:', error);
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
  const authCheckInProgressRef = useRef(false); // Prevent concurrent checkAuthStatus calls (React 19 Strict Mode)
  const lastAuthCheckTimeRef = useRef(0); // Timestamp of last successful auth check (prevents duplicate /auth/me calls)
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

  // Safely sign out from Supabase without surfacing noisy 403 global logout errors.
  const safeSupabaseSignOut = useCallback(async ({ preferGlobal = true } = {}) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        logger.warn('⚠️ Could not read Supabase session before signOut:', sessionError.message);
      }

      const hasSession = Boolean(session?.access_token || session?.refresh_token);
      if (!hasSession) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        return;
      }

      if (preferGlobal) {
        const { error: globalSignOutError } = await supabase.auth.signOut({ scope: 'global' });
        if (globalSignOutError) {
          const isForbidden =
            globalSignOutError?.status === 403 ||
            String(globalSignOutError?.message || '').includes('403');

          if (isForbidden) {
            logger.debug('ℹ️ Global signOut forbidden (403), falling back to local signOut');
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            return;
          }

          logger.warn('⚠️ Global signOut failed, falling back to local signOut:', globalSignOutError.message);
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        }
        return;
      }

      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    } catch (signOutError) {
      logger.warn('⚠️ Unexpected signOut error, forcing local signOut fallback:', signOutError);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    }
  }, []);

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

    // Clear chat cache to prevent stale data when switching accounts
    clearAllChatCache();

    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setError(null);
    // Rejeter les promesses en attente de refresh (utile si on se déconnecte pendant un refresh)
    resolveRefreshQueue(new Error('User logged out'), null);
    
    // Ne pas appeler signOut() si on est déjà déconnecté (évite la boucle)
    if (!skipSignOut) {
      // Use await if possible, but since logout is not async in signature (to be safe with UI),
      // we just fire and forget, but we CLEARED local tokens first so UI is safe.
      safeSupabaseSignOut({ preferGlobal: true }).catch(err => logger.error('SignOut error:', err)).finally(() => {
        isLoggingOutRef.current = false;
      });
    } else {
      isLoggingOutRef.current = false;
    }
    
    // Naviguer seulement si on n'est pas déjà sur la page de login
    if (typeof navigate === 'function' && window.location.pathname !== '/login') {
      navigate('/login');
    }
  }, [navigate, resolveRefreshQueue, safeSupabaseSignOut]);

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
      logger.debug('🔄 Attempting to refresh auth token...');

      // 1) Tenter de récupérer la session active via Supabase
      let {
        data: { session: activeSession },
        error: getSessionError
      } = await supabase.auth.getSession();

      if (getSessionError) {
        logger.warn('⚠️ getSession error:', getSessionError.message);
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
          logger.debug('🔄 Rehydrating Supabase session from stored tokens');
          const { data, error } = await supabase.auth.setSession({
            access_token: storedSession.access_token,
            refresh_token: storedRefreshToken
          });

          if (error) {
            logger.error('❌ setSession failed:', error.message);
            // If setSession fails, clear activeSession to force refreshSession
            activeSession = null;
          } else {
            activeSession = data?.session;
          }
        } else if (storedRefreshToken) {
          // We have refresh token but no access token - skip to refreshSession
          logger.debug('🔄 No access token found, will use refreshSession');
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
                logger.debug('ℹ️ Refresh token invalid or already used, cleaning up...');
                logger.debug('🔄 Error details:', error.message);

                // Nettoyer tous les tokens
                safeRemoveItem('supabaseRefreshToken');
                safeRemoveItem('authToken');
                safeRemoveItem('sb-auth-token');
                localStorage.removeItem('sb-auth-token'); // Double cleanup

                throw new Error('Refresh token invalid or already used');
              }
              logger.error('❌ refreshSession failed:', error.message);
              throw error;
            }
            activeSession = data?.session;
          } catch (refreshError) {
            // Si le refresh échoue, nettoyer les tokens et arrêter
            if (refreshError.message?.includes('Refresh token invalid') ||
                refreshError.message?.includes('Invalid Refresh Token') ||
                refreshError.message?.includes('Refresh Token Not Found') ||
                refreshError.message?.includes('Already Used')) {
              logger.debug('🚨 Refresh token is invalid or already used');
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

      logger.debug('✅ Token refreshed successfully');
      refreshFailureCountRef.current = 0; // Réinitialiser le compteur en cas de succès
      resolveRefreshQueue(null, activeSession.access_token);
      return activeSession.access_token;
    } catch (error) {
      logger.error('❌ Failed to refresh token:', error);
      refreshFailureCountRef.current += 1; // Incrémenter le compteur d'échecs
      resolveRefreshQueue(error, null);

      // If refresh token is invalid, we MUST log out the user locally
      // otherwise they are stuck in a loop of failed refreshes
      if (error.message && (
          error.message.includes('Refresh token invalid') ||
          error.message.includes('Invalid Refresh Token') ||
          error.message.includes('Refresh Token Not Found') ||
          error.message.includes('Already Used'))) {
          logger.debug('🔒 Refresh token invalid or already used, forcing logout...');
          refreshFailureCountRef.current = 0; // Reset counter before logout
          logout(true); // skipSignOut=true because session is likely gone
      } else if (refreshFailureCountRef.current >= MAX_REFRESH_FAILURES) {
          // Trop d'échecs consécutifs : forcer la déconnexion pour éviter les boucles infinies
          logger.error(`🔒 Too many refresh failures (${refreshFailureCountRef.current}), forcing logout to prevent infinite loop...`);
          refreshFailureCountRef.current = 0; // Reset counter before logout
          logout(true); // skipSignOut=true to avoid recursive calls
      } else {
          // Just clean up tokens for other errors
          logger.warn(`⚠️ Refresh failed (${refreshFailureCountRef.current}/${MAX_REFRESH_FAILURES}). Will retry on next attempt.`);
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
            logger.error('🚨 Too many authentication failures. Request rejected to prevent infinite loop.');
            return Promise.reject(error);
          }

          logger.warn('🚨 Interceptor: Caught 401 Unauthorized. Attempting token refresh...');
          originalRequest._retry = true;
          const newToken = await refreshAuthToken();
          if (newToken) {
            logger.debug('✅ Token refreshed, retrying original request...');
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
          logger.warn('❌ Refresh failed or no session. Not retrying.');
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

  // Helper: decode JWT and check if expired or expiring within `bufferSec` seconds
  const isTokenExpiredOrExpiring = (token, bufferSec = 60) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return false; // No exp claim, can't tell
      return Date.now() >= (payload.exp - bufferSec) * 1000;
    } catch {
      return true; // Can't decode → treat as expired
    }
  };

  // Function to check if user is already authenticated
  const checkAuthStatus = async () => {
    // Deduplication guard: prevent concurrent calls (React 19 Strict Mode, onAuthStateChange races)
    if (authCheckInProgressRef.current) {
      logger.debug('ℹ️ checkAuthStatus already in progress, skipping');
      return;
    }
    authCheckInProgressRef.current = true;

    try {
      setLoading(true);

      // 1. Check if we have any auth-related data in storage at all
      const hasAuthData = safeGetItem('authToken') ||
                         safeGetItem('supabaseRefreshToken') ||
                         safeGetItem('sb-auth-token');

      if (!hasAuthData) {
        logger.debug('ℹ️ No auth data in storage, skipping Supabase check');
        setUser(null);
        return;
      }

      // 2. Get cached session from Supabase
      let session = null;
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Session check timeout')), 8000)
          )
        ]);
        session = sessionResult?.data?.session || null;
      } catch (error) {
        if (error.message === 'Session check timeout') {
          logger.debug('⏱️ Supabase session check timeout');
        }
        session = null;
      }

      // 3. If we have a session with an access_token, check if it's expired/expiring
      if (session?.access_token && isTokenExpiredOrExpiring(session.access_token)) {
        logger.debug('🔄 Token expired or expiring soon, refreshing...');
        const newToken = await refreshAuthToken();
        if (newToken) {
          // refreshAuthToken already persists tokens and updates axios headers
          session = { ...session, access_token: newToken };
        } else {
          // Refresh failed — refreshAuthToken handles logout if needed
          setUser(null);
          return;
        }
      }

      // 4. If still no valid session, try refreshing from stored refresh token
      if (!session?.access_token) {
        logger.debug('🔄 No valid session, attempting refresh...');
        const newToken = await refreshAuthToken();
        if (newToken) {
          session = { access_token: newToken };
        } else {
          // No session and refresh failed
          safeRemoveItem('authToken');
          safeRemoveItem('supabaseRefreshToken');
          safeRemoveItem('sb-auth-token');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
          return;
        }
      }

      // 5. We have a fresh token — persist and call /auth/me
      persistSessionTokens(session);
      axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;

      try {
        const response = await axios.get(`${getApiBaseUrlWithApi()}/auth/me`, {
          timeout: 5000,
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const userData = response.data.user;
        setUser(userData);
        lastAuthCheckTimeRef.current = Date.now();
        // Compte élève : autorisé sur mobile et tablette uniquement
        if (userData?.role === 'student' && isDesktopViewport()) {
          safeRemoveItem('authToken');
          safeRemoveItem('supabaseRefreshToken');
          safeRemoveItem('sb-auth-token');
          delete axios.defaults.headers.common['Authorization'];
          await safeSupabaseSignOut({ preferGlobal: false });
          setUser(null);
          setError('L\'accès élève n\'est disponible que sur mobile ou tablette. Utilisez un appareil mobile pour vous connecter.');
          return;
        }
        logger.debug('✅ Auth check successful');
      } catch (error) {
        if (error.response?.status === 401) {
          // Token was supposed to be fresh but backend still rejected it
          logger.error('❌ Backend rejected fresh token (401). Clearing session.');
          safeRemoveItem('authToken');
          safeRemoveItem('supabaseRefreshToken');
          safeRemoveItem('sb-auth-token');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
        } else {
          // Network/timeout error — use Supabase session data as fallback
          logger.warn('⚠️ Backend unreachable, using Supabase session as fallback');
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession?.user) {
            const fallbackRole = currentSession.user.user_metadata?.role || 'coach';
            if (fallbackRole === 'student' && isDesktopViewport()) {
              safeRemoveItem('authToken');
              safeRemoveItem('supabaseRefreshToken');
              safeRemoveItem('sb-auth-token');
              delete axios.defaults.headers.common['Authorization'];
              await safeSupabaseSignOut({ preferGlobal: false });
              setUser(null);
              setError('L\'accès élève n\'est disponible que sur mobile ou tablette. Utilisez un appareil mobile pour vous connecter.');
            } else {
              setUser({
                id: currentSession.user.id,
                email: currentSession.user.email,
                name: currentSession.user.user_metadata?.name || currentSession.user.user_metadata?.full_name || 'User',
                role: fallbackRole
              });
            }
          } else {
            setUser(null);
          }
        }
      }
    } catch (error) {
      logger.error('Auth check failed:', error);
      safeRemoveItem('authToken');
      safeRemoveItem('supabaseRefreshToken');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
      authCheckInProgressRef.current = false;
      logger.debug('✅ Auth check completed');
    }
  };

  // Check if user is already logged in on app start
  useEffect(() => {
    let isMounted = true;
    
    // S'assurer que loading est false après un court délai si checkAuthStatus échoue silencieusement
    const loadingSafetyTimeout = setTimeout(() => {
      if (isMounted) {
        logger.warn('⚠️ Loading still true after 15 seconds, forcing to false');
        setLoading(false);
      }
    }, 15000);
    
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
           logger.debug('🔄 Auth state changed: SIGNED_OUT');
           // Si ce n'est pas nous qui avons initié la déconnexion (isLoggingOutRef est false),
           // alors ça vient d'un autre onglet -> on doit se déconnecter localement
           if (!isLoggingOutRef.current) {
             logger.debug('🔄 Detected logout from another source, syncing local state...');
             logout(true); // skipSignOut=true car déjà déconnecté côté Supabase
           }
           return;
        }

        // Handle PASSWORD_RECOVERY event specifically
        if (event === 'PASSWORD_RECOVERY') {
          logger.debug('🔄 Auth state changed: PASSWORD_RECOVERY');
          // Treat PASSWORD_RECOVERY exactly like SIGNED_IN to ensure user state is updated
          // This is crucial for the ResetPasswordPage to detect the authenticated session
        }
        
        // Ignorer si on est déjà en train de traiter un événement
        if (isProcessing) {
          return;
        }
        
        isProcessing = true;
        logger.debug('🔄 Auth state changed:', event, session?.user?.email);
        
        try {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY') {
            if (session) {
              logger.debug('✅ Supabase auto-refresh completed, persisting new tokens...');
              // Synchroniser le token avec localStorage et axios
              persistSessionTokens(session);

              // Si un refresh manuel est en cours, le résoudre avec le nouveau token
              if (isRefreshingRef.current) {
                logger.debug('🔄 Manual refresh in progress, resolving with Supabase token');
                resolveRefreshQueue(null, session.access_token);
                isRefreshingRef.current = false;
              }

              // Skip /auth/me if checkAuthStatus is running OR just completed within 3s
              const msSinceLastCheck = Date.now() - lastAuthCheckTimeRef.current;
              if (authCheckInProgressRef.current || msSinceLastCheck < 3000) {
                logger.debug('ℹ️ Auth check in progress or recently completed, skipping /auth/me from onAuthStateChange');
              } else {
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

  // Proactively refresh session when user returns to tab after >5 minutes
  // (browsers suspend setInterval for background tabs, so the 15-min refresh may not run)
  useEffect(() => {
    let lastVisibleTime = Date.now();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastVisibleTime;
        if (elapsed > 5 * 60 * 1000) {
          logger.debug('🔄 Tab became visible after', Math.round(elapsed / 60000), 'min - refreshing session...');
          refreshAuthToken().catch(() => {});
        }
        lastVisibleTime = Date.now();
      } else {
        lastVisibleTime = Date.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshAuthToken]);

  // Login function (optimized - synchronise avec Supabase)
  const login = async (email, password, navigate, redirectPath = null) => {
    // Timeout de sécurité pour forcer le loading à false après 30 secondes
    const loadingTimeout = setTimeout(() => {
      logger.warn('⚠️ Login timeout - forcing loading to false');
      setLoading(false);
    }, 30000);
    
    try {
      setLoading(true);
      setError(null);
      
      const loginUrl = `${getApiBaseUrlWithApi()}/auth/login`;
      logger.debug('🔐 Login attempt to URL:', loginUrl);
      
      const response = await axios.post(loginUrl, {
        email,
        password
      });

      logger.debug('🔐 Login response received:', response.status);
      const { token, refreshToken, user } = response.data;

      // Compte élève : autorisé sur mobile et tablette uniquement
      if (user?.role === 'student' && isDesktopViewport()) {
        const msg = 'L\'accès élève n\'est disponible que sur mobile ou tablette. Utilisez un appareil mobile pour vous connecter.';
        setError(msg);
        clearTimeout(loadingTimeout);
        setLoading(false);
        return { success: false, error: msg };
      }
      
      // Synchroniser avec Supabase pour bénéficier de la gestion automatique
      let session = null;
      const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (existingSession && !sessionError) {
        session = existingSession;
        logger.debug('🔐 Existing Supabase session detected');
      }

      if (!session && token && refreshToken) {
        logger.debug('🔐 No Supabase session found, setting session manually');
        const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
          access_token: token,
          refresh_token: refreshToken
        });

        if (setSessionError) {
          logger.error('❌ supabase.auth.setSession failed:', setSessionError.message);
        } else {
          session = setSessionData?.session || null;
        }
      }

      if (session) {
        // Utiliser la session Supabase (plus fiable, inclut refresh token)
        persistSessionTokens(session);
        logger.debug('🔐 Supabase session established');
      } else if (token) {
        // Dernier recours: utiliser uniquement le token du backend pour ne pas bloquer l'utilisateur
        safeSetItem('authToken', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        logger.warn('⚠️ Supabase session not available, falling back to access token only');
      } else {
        throw new Error('No access token returned from login response');
      }
      
      // Update user state
      setUser(user);
      logger.debug('🔐 User state updated:', user?.email);
      
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
          targetPath = '/coach/dashboard';
        }
      }
      
      logger.debug('🔐 Navigating to:', targetPath);
      navigate(targetPath);

      clearTimeout(loadingTimeout);
      return { success: true };
    } catch (error) {
      logger.error('🔐 Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      setError(errorMessage);
      clearTimeout(loadingTimeout);
      return { success: false, error: errorMessage };
    } finally {
      clearTimeout(loadingTimeout);
      logger.debug('🔐 Login finally - setting loading to false');
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
            logger.error('❌ supabase.auth.setSession failed during register:', setSessionError.message);
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
            navigate('/coach/dashboard');
        }

        return { success: true };
      } else {
        // Handle unexpected response structure
        logger.error('Unexpected response structure:', response.data);
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
          logger.debug('✅ Found Supabase session, using its token');
          persistSessionTokens(session);
          token = session.access_token;
        } else {
          // Fallback to refresh
          token = await refreshAuthToken();
        }
      } catch (error) {
        logger.error('❌ Could not get or refresh token:', error);
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
          logger.debug('🔄 Token expired or about to expire, refreshing...');
          try {
            token = await refreshAuthToken();
          } catch (error) {
            logger.warn('⚠️ Failed to refresh expired token, but token might still be valid:', error.message);
            // Don't return null immediately - the token might still work for a few seconds
            // Return the existing token and let the API call fail if it's really expired
          }
        }
      } catch (e) {
        // Token format invalid - might be a Supabase token with different format
        // Try to verify by checking if we have a Supabase session
        logger.warn('⚠️ Could not parse token format, checking Supabase session...');
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (session && session.access_token && !sessionError) {
            logger.debug('✅ Found valid Supabase session, updating token');
            persistSessionTokens(session);
            token = session.access_token;
          } else {
            // Token format is invalid and no Supabase session - try refresh
            token = await refreshAuthToken();
          }
        } catch (error) {
          logger.error('❌ Could not verify token with Supabase:', error);
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
      
      logger.debug('🔐 Starting Google sign-in...');
      
      // Get the current origin for redirect URL
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      // Debug: Check storage before OAuth
      logger.debug('🔍 Storage check before OAuth:');
      try {
        if (typeof window !== 'undefined') {
          logger.debug('  - sessionStorage available:', !!window.sessionStorage);
          logger.debug('  - localStorage available:', !!window.localStorage);
          
          // Log all sessionStorage keys (for debugging PKCE)
          if (window.sessionStorage) {
            const sessionKeys = [];
            for (let i = 0; i < window.sessionStorage.length; i++) {
              const key = window.sessionStorage.key(i);
              if (key && (key.includes('auth') || key.includes('supabase') || key.includes('pkce'))) {
                sessionKeys.push(key);
              }
            }
            logger.debug('  - Relevant sessionStorage keys:', sessionKeys);
          }
        }
      } catch (e) {
        logger.warn('  - Error checking storage:', e);
      }
      
      // Initiate Google OAuth flow through Supabase
      // With PKCE, Supabase will automatically generate and store the code verifier
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        }
      });

      if (error) {
        logger.error('❌ Google sign-in error:', error);
        setError(error.message || 'Erreur lors de la connexion Google');
        setLoading(false);
        return { success: false, error: error.message };
      }

      // Debug: Check if code verifier was stored after OAuth initiation
      logger.debug('🔍 Storage check after OAuth initiation:');
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const sessionKeys = [];
          for (let i = 0; i < window.sessionStorage.length; i++) {
            const key = window.sessionStorage.key(i);
            if (key && (key.includes('auth') || key.includes('supabase') || key.includes('pkce') || key.includes('code'))) {
              sessionKeys.push(key);
            }
          }
          logger.debug('  - Relevant sessionStorage keys after OAuth:', sessionKeys);
          if (sessionKeys.length === 0) {
            logger.warn('  ⚠️ WARNING: No PKCE-related keys found in sessionStorage!');
            logger.warn('  ⚠️ This may cause "code verifier not found" error in callback');
          }
        }
      } catch (e) {
        logger.warn('  - Error checking storage after OAuth:', e);
      }

      // Note: The actual redirect will happen, so we don't need to handle navigation here
      // The callback URL will handle the rest
      logger.debug('✅ Google sign-in initiated, redirecting to:', redirectUrl);
      logger.debug('📝 OAuth URL:', data?.url || 'No URL returned');
      
      // Don't set loading to false here because we're redirecting
      return { success: true };
    } catch (error) {
      logger.error('❌ Google sign-in exception:', error);
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
      logger.error('Reset password error:', error);
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
      logger.error('Update password error:', error);
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
