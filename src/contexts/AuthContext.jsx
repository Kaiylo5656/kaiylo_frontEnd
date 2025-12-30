import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrlWithApi, buildApiUrl } from '../config/api';
import { supabase } from '../lib/supabase';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage';

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
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setError(null);
    // Rejeter les promesses en attente de refresh (utile si on se déconnecte pendant un refresh)
    resolveRefreshQueue(new Error('User logged out'), null);
    
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
                  error.message?.includes('Refresh Token Not Found')) {
                console.log('ℹ️ Refresh token invalid, cleaning up...');
                safeRemoveItem('supabaseRefreshToken');
                safeRemoveItem('authToken');
                throw new Error('Refresh token invalid');
              }
              console.error('❌ refreshSession failed:', error.message);
              throw error;
            }
            activeSession = data?.session;
          } catch (refreshError) {
            // Si le refresh échoue, nettoyer les tokens et arrêter
            if (refreshError.message?.includes('Refresh token invalid') ||
                refreshError.message?.includes('Invalid Refresh Token') ||
                refreshError.message?.includes('Refresh Token Not Found')) {
              safeRemoveItem('supabaseRefreshToken');
              safeRemoveItem('authToken');
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

      console.log('✅ Token refreshed successfully');
      resolveRefreshQueue(null, activeSession.access_token);
      return activeSession.access_token;
    } catch (error) {
      console.error('❌ Failed to refresh token:', error);
      resolveRefreshQueue(error, null);
      
      // If refresh token is invalid, we MUST log out the user locally
      // otherwise they are stuck in a loop of failed refreshes
      if (error.message && (
          error.message.includes('Refresh token invalid') || 
          error.message.includes('Invalid Refresh Token') ||
          error.message.includes('Refresh Token Not Found'))) {
          console.log('🔒 Refresh token invalid, forcing logout...');
          logout(true); // skipSignOut=true because session is likely gone
      } else {
          // Just clean up tokens for other errors
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
          console.warn('❌ Refresh failed or no session. Not retrying.');
          // Ne pas appeler logout() ici, laisser l'application gérer l'état de déconnexion
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
      
      // Essayer Supabase avec timeout (peut être bloqué)
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 2000)
        );
        
        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]).catch((error) => {
          // Timeout ou erreur, on ignore Supabase
          console.warn('⚠️ Supabase session check timed out or failed, skipping');
          return { data: { session: null }, error: { message: error.message || 'Timeout' } };
        });
        
        if (session && !sessionError && session.access_token) {
          // Session Supabase valide
          persistSessionTokens(session);
          
          // Récupérer les infos utilisateur depuis le backend
          try {
            const response = await axios.get(`${getApiBaseUrlWithApi()}/auth/me`, {
              timeout: 3000
            });
            setUser(response.data.user);
            console.log('✅ Auth check successful via Supabase session');
            return; // Succès, on sort
          } catch (error) {
            // Si le backend retourne 401, le token Supabase est peut-être invalide
            if (error.response?.status === 401) {
              console.warn('⚠️ Supabase session token invalid with backend, cleaning up...');
              // Nettoyer et continuer
            } else {
              console.error('Failed to get user info from backend:', error);
              // Si le backend échoue pour une autre raison, utiliser les infos de la session Supabase
              setUser({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.name || 'User',
                role: session.user.user_metadata?.role || 'coach'
              });
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
              persistSessionTokens(session);
              
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
      
      // Navigate based on user role
      let targetPath;
      
      if (redirectPath) {
        targetPath = redirectPath;
      } else {
        targetPath = user.role === 'admin' ? '/admin/dashboard' 
        : user.role === 'coach' ? '/coach/dashboard'
        : user.role === 'student' ? '/student/dashboard'
        : '/dashboard';
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
    
    // If no token found, try to refresh
    if (!token) {
      try {
        token = await refreshAuthToken();
      } catch (error) {
        console.error('❌ Could not get or refresh token:', error);
        return null;
      }
    } else {
      // Check if token is expired or about to expire (within 30 seconds)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiration = payload.exp * 1000;
        if (Date.now() > expiration - 30000) {
          console.log('🔄 Token expired or about to expire, refreshing...');
          try {
            token = await refreshAuthToken();
          } catch (error) {
            console.error('❌ Failed to refresh expired token:', error);
            return null;
          }
        }
      } catch (e) {
        console.warn('⚠️ Invalid token format in getAuthToken, refreshing...');
        try {
          token = await refreshAuthToken();
        } catch (error) {
          return null;
        }
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
