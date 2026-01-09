import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuthStatus } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for error in URL parameters
        const urlError = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (urlError) {
          console.error('❌ OAuth error:', urlError, errorDescription);
          setError(errorDescription || urlError);
          // Redirect to login with error after a delay
          setTimeout(() => {
            navigate(`/login?error=${encodeURIComponent(errorDescription || urlError)}`, { replace: true });
          }, 2000);
          return;
        }

        // Get the session from URL hash after OAuth redirect
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Error getting session:', sessionError);
          setError(sessionError.message || 'authentication_failed');
          setTimeout(() => {
            navigate('/login?error=authentication_failed', { replace: true });
          }, 2000);
          return;
        }

        if (session && session.access_token) {
          console.log('✅ OAuth session established:', session.user.email);
          
          // Persist session tokens manually
          const accessToken = session.access_token;
          const refreshToken = session.refresh_token;

          if (accessToken) {
            try {
              localStorage.setItem('authToken', accessToken);
              // Also set axios default header
              const axios = (await import('axios')).default;
              axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            } catch (err) {
              console.warn('Failed to persist access token:', err);
            }
          }
          
          if (refreshToken) {
            try {
              localStorage.setItem('supabaseRefreshToken', refreshToken);
            } catch (err) {
              console.warn('Failed to persist refresh token:', err);
            }
          }

          // Also store full session for Supabase
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
            localStorage.setItem('sb-auth-token', JSON.stringify(sessionWrapper));
          } catch (err) {
            console.warn('Failed to persist session:', err);
          }
          
          // Update auth status to get user data from backend
          await checkAuthStatus();
          
          // Wait a bit for the auth status to update
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Get user role to navigate appropriately
          const userRole = session.user.user_metadata?.role || 'student';
          
          // Navigate based on user role
          const targetPath = 
            userRole === 'admin' ? '/admin/dashboard' 
            : userRole === 'coach' ? '/coach/dashboard'
            : userRole === 'student' ? '/student/dashboard'
            : '/dashboard';
          
          console.log('✅ Navigating to:', targetPath);
          navigate(targetPath, { replace: true });
        } else {
          console.warn('⚠️ No session found after OAuth callback');
          setError('Aucune session trouvée après la connexion Google');
          setTimeout(() => {
            navigate('/login?error=no_session', { replace: true });
          }, 2000);
        }
      } catch (error) {
        console.error('❌ Auth callback error:', error);
        setError(error.message || 'Erreur lors de la connexion');
        setTimeout(() => {
          navigate(`/login?error=${encodeURIComponent(error.message || 'callback_error')}`, { replace: true });
        }, 2000);
      }
    };

    handleAuthCallback();
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

