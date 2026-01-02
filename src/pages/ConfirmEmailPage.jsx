import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import LoadingSpinner from '../components/LoadingSpinner';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const ConfirmEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Get token_hash and type from URL parameters
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type'); // Should be 'email'

        if (!tokenHash) {
          setStatus('error');
          setMessage('Lien de confirmation invalide. Le token est manquant.');
          return;
        }

        if (type !== 'email') {
          setStatus('error');
          setMessage('Type de confirmation invalide.');
          return;
        }

        // Verify the email confirmation token
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'email'
        });

        if (error) {
          console.error('Email confirmation error:', error);
          setStatus('error');
          
          // Provide user-friendly error messages
          if (error.message.includes('expired') || error.message.includes('invalid')) {
            setMessage('Ce lien de confirmation a expiré ou est invalide. Veuillez demander un nouveau lien de confirmation.');
          } else if (error.message.includes('already')) {
            setMessage('Votre email a déjà été confirmé. Vous pouvez vous connecter.');
          } else {
            setMessage('Erreur lors de la confirmation de l\'email. Veuillez réessayer.');
          }
          return;
        }

        if (data?.user) {
          setStatus('success');
          setMessage('Votre email a été confirmé avec succès ! Vous pouvez maintenant vous connecter.');
          
          // Redirect to login page after 3 seconds
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        } else {
          setStatus('error');
          setMessage('Erreur lors de la confirmation. Aucune donnée utilisateur retournée.');
        }
      } catch (error) {
        console.error('Unexpected error during email confirmation:', error);
        setStatus('error');
        setMessage('Une erreur inattendue s\'est produite. Veuillez réessayer.');
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Logo />
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {status === 'loading' && (
            <div className="text-center">
              <LoadingSpinner />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Confirmation de l'email en cours...
              </h2>
              <p className="mt-2 text-gray-600">
                Veuillez patienter pendant que nous confirmons votre adresse email.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Email confirmé avec succès !
              </h2>
              <p className="mt-2 text-gray-600">
                {message}
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Vous allez être redirigé vers la page de connexion...
              </p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/login', { replace: true })}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Aller à la page de connexion
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="flex justify-center">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Erreur de confirmation
              </h2>
              <p className="mt-2 text-gray-600">
                {message}
              </p>
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => navigate('/login', { replace: true })}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Aller à la page de connexion
                </button>
                <button
                  onClick={() => navigate('/register', { replace: true })}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Créer un nouveau compte
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmailPage;

