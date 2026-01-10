import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuthStatus } = useAuth();
  const [error, setError] = useState(null);
  const sessionProcessedRef = useRef(false);

  useEffect(() => {
    console.log('🔄 AuthCallback mounted, checking OAuth callback...');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 URL search params:', Object.fromEntries(searchParams.entries()));
    
    // Check for error in URL parameters first
    const urlError = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const code = searchParams.get('code');
    
    console.log('🔍 OAuth callback params:', { urlError, errorDescription, hasCode: !!code });
    
    if (urlError) {
      console.error('❌ OAuth error:', urlError, errorDescription);
      setError(errorDescription || urlError);
      setTimeout(() => {
        navigate(`/login?error=${encodeURIComponent(errorDescription || urlError)}`, { replace: true });
      }, 2000);
      return;
    }
    
    if (!code) {
      console.error('❌ No OAuth code found in URL');
      setError('Code OAuth manquant');
      setTimeout(() => {
        navigate('/login?error=no_code', { replace: true });
      }, 2000);
      return;
    }

    // With PKCE flow, Supabase should automatically process the code with detectSessionInUrl: true
    // But if it doesn't work, we'll try to trigger it manually
    if (code) {
      console.log('✅ OAuth code found in URL, Supabase should process it automatically');
      console.log('⏳ Waiting for Supabase to process the code...');
      
      // Give Supabase a moment to process the code automatically
      // The onAuthStateChange listener below will handle when the session is ready
    } else if (!window.location.hash) {
      console.warn('⚠️ No OAuth code or hash found in URL');
      console.warn('⚠️ URL:', window.location.href);
      setError('Aucun code OAuth trouvé dans l\'URL');
      setTimeout(() => {
        navigate('/login?error=no_oauth_code', { replace: true });
      }, 2000);
      return;
    } else if (window.location.hash) {
      console.log('✅ URL hash found, Supabase should process it automatically');
    }

    // Listen for auth state changes (OAuth callback processing)
    // With detectSessionInUrl: true, Supabase automatically processes the code
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session ? 'Session present' : 'No session');
        
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && session.access_token) {
          if (sessionProcessedRef.current) {
            console.log('⚠️ Session already processed, ignoring duplicate event');
            return;
          }
          sessionProcessedRef.current = true;
          
          console.log('✅ OAuth session established:', session.user.email);
          
          try {
            // Persist tokens
            const accessToken = session.access_token;
            const refreshToken = session.refresh_token;

            localStorage.setItem('authToken', accessToken);
            localStorage.setItem('supabaseRefreshToken', refreshToken);
            
            // Set axios header
            const axios = (await import('axios')).default;
            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            
            // Get user role and navigate
            const userRole = session.user.user_metadata?.role || 'student';
            const targetPath = 
              userRole === 'admin' ? '/admin/dashboard' 
              : userRole === 'coach' ? '/coach/dashboard'
              : userRole === 'student' ? '/student/dashboard'
              : '/dashboard';
            
            console.log('✅ Navigating to:', targetPath);
            
            // Small delay to ensure storage is written
            await new Promise(resolve => setTimeout(resolve, 100));
            
            navigate(targetPath, { replace: true });
          } catch (err) {
            console.error('❌ Error processing OAuth session:', err);
            setError('Erreur lors du traitement de la session');
            setTimeout(() => {
              navigate('/login?error=session_processing_error', { replace: true });
            }, 2000);
          }
        }
      }
    );

    // Fallback timeout: if onAuthStateChange doesn't fire within 5 seconds, redirect to error
    const timeoutId = setTimeout(() => {
      if (!sessionProcessedRef.current) {
        console.error('⏰ Timeout: OAuth callback took too long, onAuthStateChange did not fire');
        setError('La connexion Google a pris trop de temps');
        navigate('/login?error=callback_timeout', { replace: true });
      }
    }, 5000); // 5 seconds timeout

    // Cleanup subscription and timeout
    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [navigate, searchParams, checkAuthStatus]);

  // Show error if any
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center p-6">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <h2 className="text-white text-lg mb-2">Erreur de connexion</h2>
          <p className="text-white/70 text-sm mb-4">{error}</p>
          <p className="text-white/50 text-xs">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return <LoadingSpinner />;
};

export default AuthCallback;

