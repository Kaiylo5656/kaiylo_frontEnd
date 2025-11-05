import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';

const VersionInfo = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [buildInfo, setBuildInfo] = useState(null);

  useEffect(() => {
    // Try to fetch from build-info.json first (generated at build time)
    const fetchBuildInfo = async () => {
      try {
        const response = await fetch('/build-info.json?t=' + Date.now());
        if (response.ok) {
          // Check if response is actually JSON (not HTML 404 page)
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const buildInfoFromFile = await response.json();
            if (buildInfoFromFile.commit && buildInfoFromFile.commit !== 'dev') {
              setBuildInfo(buildInfoFromFile);
              console.log('✅ Build info loaded from file:', buildInfoFromFile);
              return;
            }
          }
        }
      } catch (error) {
        // Silently fail - file doesn't exist yet (development) or network error
        // This is expected in development since build-info.json is only generated during build
      }
      
      // Fallback: Get build info from injected variables (defined in vite.config.js)
      // eslint-disable-next-line no-undef
      let commit = typeof __VERCEL_COMMIT__ !== 'undefined' ? __VERCEL_COMMIT__ : '';
      
      // Fallback: try to get from import.meta.env (Vercel exposes these)
      if (!commit || commit === '') {
        commit = import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || 
                 import.meta.env.VERCEL_GIT_COMMIT_SHA || 
                 import.meta.env.VITE_VERCEL_GIT_COMMIT_REF ||
                 'dev';
      }
      
      // Get build time - Vite replaces __BUILD_TIME__ at build time
      // eslint-disable-next-line no-undef
      const buildTime = typeof __BUILD_TIME__ !== 'undefined' 
        ? __BUILD_TIME__ 
        : new Date().toISOString();
      
      // eslint-disable-next-line no-undef
      let env = typeof __VERCEL_ENV__ !== 'undefined' ? __VERCEL_ENV__ : '';
      if (!env || env === '') {
        env = import.meta.env.VITE_VERCEL_ENV || 
              import.meta.env.VERCEL_ENV || 
              import.meta.env.MODE || 
              'development';
      }
      
      // eslint-disable-next-line no-undef
      let url = typeof __VERCEL_URL__ !== 'undefined' ? __VERCEL_URL__ : '';
      if (!url || url === '') {
        url = import.meta.env.VITE_VERCEL_URL || 
              import.meta.env.VERCEL_URL || 
              window.location.hostname;
      }

      // Debug: log all available Vercel env vars
      // eslint-disable-next-line no-undef
      const injectedCommit = typeof __VERCEL_COMMIT__ !== 'undefined' ? __VERCEL_COMMIT__ : 'undefined';
      console.log('🔍 Version Info Debug:', {
        commit,
        injectedCommit,
        buildTime,
        env,
        url,
        allVercelEnv: {
          VERCEL_GIT_COMMIT_SHA: import.meta.env.VERCEL_GIT_COMMIT_SHA,
          VITE_VERCEL_GIT_COMMIT_SHA: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA,
          VERCEL_ENV: import.meta.env.VERCEL_ENV,
          VERCEL_URL: import.meta.env.VERCEL_URL,
        }
      });

      setBuildInfo({
        commit: commit,
        buildTime: buildTime,
        env: env,
        url: url,
      });
    };
    
    fetchBuildInfo();

    // Keyboard shortcut: Ctrl+Shift+V or Cmd+Shift+V
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!buildInfo) return null;

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const shortCommit = buildInfo.commit.length >= 7 ? buildInfo.commit.substring(0, 7) : buildInfo.commit;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-[#d4845a] hover:bg-[#d4845a]/90 text-white p-2 rounded-full shadow-lg transition-all hover:scale-110"
        title="Afficher la version (Ctrl+Shift+V)"
        aria-label="Version info"
      >
        <Info className="h-5 w-5" />
      </button>

      {/* Modal */}
      {isVisible && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur z-[100] flex items-center justify-center p-4"
          onClick={() => setIsVisible(false)}
        >
          <div
            className="bg-[#121212] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Informations de version</h2>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Commit:</span>
                <span className="text-white font-mono">{shortCommit}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Build:</span>
                <span className="text-white">{formatDate(buildInfo.buildTime)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Environnement:</span>
                <span className="text-white capitalize">{buildInfo.env}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Domaine:</span>
                <span className="text-white">{buildInfo.url}</span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-gray-500">
                  Raccourci: <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">Ctrl+Shift+V</kbd>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VersionInfo;

