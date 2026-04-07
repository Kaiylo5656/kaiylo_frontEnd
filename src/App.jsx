import { Suspense } from 'react';
import { lazyImport } from './utils/lazyImport';
import logger from './utils/logger';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BackgroundUploadProvider } from './contexts/BackgroundUploadContext';
import { StudentPlanningProvider } from './contexts/StudentPlanningContext';
import PWAProvider from './components/PWAProvider';
import { ModalManagerProvider } from './components/ui/modal/ModalManager';
import MainLayout from './components/MainLayout';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy-loaded pages (code splitting); lazyImport recovers from stale chunk / HTML MIME errors after deploy
const LoginPage = lazyImport(() => import('./pages/LoginPage'));
const RegisterPage = lazyImport(() => import('./pages/RegisterPage'));
const StudentRegisterPage = lazyImport(() => import('./pages/StudentRegisterPage'));
const ForgotPasswordPage = lazyImport(() => import('./pages/ForgotPasswordPage'));
const StudentInvitationPage = lazyImport(() => import('./pages/StudentInvitationPage'));
const ConfirmEmailPage = lazyImport(() => import('./pages/ConfirmEmailPage'));
const AuthCallback = lazyImport(() => import('./pages/AuthCallback'));
const RegistrationSuccessPage = lazyImport(() => import('./pages/RegistrationSuccessPage'));
const OnboardingPage = lazyImport(() => import('./pages/OnboardingPage'));
const ResetPasswordPage = lazyImport(() => import('./pages/ResetPasswordPage'));
const CoachDashboard = lazyImport(() => import('./pages/CoachDashboard'));
const StudentDashboard = lazyImport(() => import('./pages/StudentDashboard'));
const StudentMonthlyView = lazyImport(() => import('./pages/StudentMonthlyView'));
const StudentHistoryPage = lazyImport(() => import('./pages/StudentHistoryPage'));
const ExerciseManagement = lazyImport(() => import('./pages/ExerciseManagement'));
const WorkoutSessionManagement = lazyImport(() => import('./pages/WorkoutSessionManagement'));
const WorkoutAssignmentManagement = lazyImport(() => import('./pages/WorkoutAssignmentManagement'));
const CoachProgressDashboard = lazyImport(() => import('./pages/CoachProgressDashboard'));
const ChatPage = lazyImport(() => import('./pages/ChatPage'));
const StudentChatPage = lazyImport(() => import('./pages/StudentChatPage'));
const VideoLibrary = lazyImport(() => import('./pages/VideoLibrary'));
const StudentVideoLibrary = lazyImport(() => import('./pages/StudentVideoLibrary'));
const FinancialTracking = lazyImport(() => import('./pages/FinancialTracking'));
const LandingPage = lazyImport(() => import('./pages/LandingPage'));
const MentionsLegalesPage = lazyImport(() => import('./pages/MentionsLegalesPage'));
const CGUPage = lazyImport(() => import('./pages/CGUPage'));
const PolitiqueConfidentialitePage = lazyImport(() => import('./pages/PolitiqueConfidentialitePage'));
const FacturationPage = lazyImport(() => import('./pages/FacturationPage'));

import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [], excludeLayout = false }) => {
  try {
    const { user, loading } = useAuth();

    if (loading) {
      return <LoadingSpinner />;
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // Redirect to appropriate dashboard based on user role
      switch (user.role) {
        case 'admin':
        case 'coach':
          return <Navigate to="/coach/dashboard" replace />;
        case 'student':
          return <Navigate to="/student/dashboard" replace />;
        default:
          return <Navigate to="/coach/dashboard" replace />;
      }
    }

    // Skip MainLayout if excludeLayout is true (for full-screen mobile pages like StudentChatPage)
    if (excludeLayout) {
      return children;
    }

    return (
      <MainLayout>
        {children}
      </MainLayout>
    );
  } catch (error) {
    // If useAuth fails, it means AuthProvider is not available
    logger.error('AuthProvider not available:', error);
    return <LoadingSpinner />;
  }
};

// Chat Route Component - conditionally renders StudentChatPage or ChatPage based on user role
const ChatRouteWrapper = () => {
  const { user, loading } = useAuth();

  if (loading) {
    // Show loading within MainLayout for coaches, or full screen for students
    return user?.role === 'coach' ? (
      <MainLayout>
        <div className="h-full flex items-center justify-center">
          <div
            className="rounded-full border-2 border-transparent animate-spin"
            style={{
              borderTopColor: '#d4845a',
              borderRightColor: '#d4845a',
              width: '40px',
              height: '40px'
            }}
          />
        </div>
      </MainLayout>
    ) : <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has permission
  if (!['coach', 'student'].includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  // Render StudentChatPage for students (full-screen mobile, no MainLayout)
  if (user.role === 'student') {
    return <StudentChatPage />;
  }

  // Default to ChatPage for coaches (with MainLayout)
  return (
    <MainLayout>
      <ChatPage />
    </MainLayout>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <BackgroundUploadProvider>
      <StudentPlanningProvider>
        <PWAProvider>
          <ModalManagerProvider>
            <>
              <div className="App">
                <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  {/* Public Routes - root is login; landing/waitlist at /waitlist */}
                  <Route path="/" element={<LoginPage />} />
                  <Route path="/waitlist" element={<LandingPage />} />
                  <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
                  <Route path="/cgu" element={<CGUPage />} />
                  <Route path="/politique-confidentialite" element={<PolitiqueConfidentialitePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/register/student" element={<StudentRegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/invite" element={<StudentInvitationPage />} />
                  <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/registration/success" element={<RegistrationSuccessPage />} />
                  <Route path="/onboarding" element={
                    <ProtectedRoute allowedRoles={['student']} excludeLayout={true}>
                      <OnboardingPage />
                    </ProtectedRoute>
                  } />

                  {/* Coach Routes */}
                  <Route
                    path="/coach/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['coach']}>
                        <CoachDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/coach/exercises"
                    element={
                      <ProtectedRoute allowedRoles={['coach']}>
                        <ExerciseManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/coach/sessions"
                    element={
                      <ProtectedRoute allowedRoles={['coach']}>
                        <WorkoutSessionManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/coach/assignments"
                    element={
                      <ProtectedRoute allowedRoles={['coach']}>
                        <WorkoutAssignmentManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/coach/progress"
                    element={
                      <ProtectedRoute allowedRoles={['coach']}>
                        <CoachProgressDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/coach/videotheque"
                    element={
                      <ProtectedRoute allowedRoles={['coach']}>
                        <VideoLibrary />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/coach/facturation"
                    element={
                      <ProtectedRoute allowedRoles={['coach']}>
                        <FacturationPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/coach/financial"
                    element={
                      <ProtectedRoute allowedRoles={['coach']}>
                        <FinancialTracking />
                      </ProtectedRoute>
                    }
                  />

                  {/* Student Routes */}
                  <Route
                    path="/student/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <StudentDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/monthly"
                    element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <StudentMonthlyView />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/history"
                    element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <StudentHistoryPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/videos"
                    element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <StudentVideoLibrary />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin routes removed — admins are redirected to /coach/dashboard */}

                  {/* Chat Route - Conditionally renders StudentChatPage for students, ChatPage for coaches */}
                  <Route
                    path="/chat"
                    element={
                      <ProtectedRoute allowedRoles={['coach', 'student']} excludeLayout={true}>
                        <ChatRouteWrapper />
                      </ProtectedRoute>
                    }
                  />

                  {/* Default redirect */}
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
                </Suspense>
              </div>
            </>
          </ModalManagerProvider>
        </PWAProvider>
      </StudentPlanningProvider>
      </BackgroundUploadProvider>
    </AuthProvider>
  );
}

export default App;
