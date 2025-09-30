const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 bg-background flex justify-center items-center h-screen w-screen z-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
};

export default LoadingSpinner;
