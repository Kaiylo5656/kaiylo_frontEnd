const LoadingSpinner = () => {
  return (
    <div 
      className="fixed inset-0 flex justify-center items-center h-screen w-screen z-50"
      style={{
        background: 'unset',
        backgroundColor: '#0a0a0a',
        backgroundImage: 'none'
      }}
    >
      {/* Image de fond */}
      <div 
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          backgroundImage: 'url(/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 1,
          backgroundColor: '#0a0a0a'
        }}
      />
      
      {/* Layer blur sur l'écran */}
      <div 
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          backdropFilter: 'blur(50px)',
          WebkitBackdropFilter: 'blur(100px)',
          backgroundColor: 'rgba(0, 0, 0, 0.01)',
          zIndex: 2,
          pointerEvents: 'none',
          opacity: 1
        }}
      />

      {/* Contenu du loader */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-4">
        {/* Spinner minimaliste */}
        <div 
          className="rounded-full border-2 border-transparent"
          style={{
            borderTopColor: '#d4845a',
            borderRightColor: '#d4845a',
            width: '40px',
            height: '40px',
            animation: 'spin 0.8s linear infinite'
          }}
        />
      </div>

      {/* Styles CSS pour les animations */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
