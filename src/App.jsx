import { lazy, Suspense } from 'react';
import logger from './utils/logger';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BackgroundUploadProvider } from './contexts/BackgroundUploadContext';
import { StudentPlanningProvider } from './contexts/StudentPlanningContext';
import PWAProvider from './components/PWAProvider';
import { ModalManagerProvider } from './components/ui/modal/ModalManager';
import MainLayout from './components/MainLayout';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy-loaded pages (code splitting)
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const StudentRegisterPage = lazy(() => import('./pages/StudentRegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const StudentInvitationPage = lazy(() => import('./pages/StudentInvitationPage'));
const ConfirmEmailPage = lazy(() => import('./pages/ConfirmEmailPage'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const RegistrationSuccessPage = lazy(() => import('./pages/RegistrationSuccessPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CoachDashboard = lazy(() => import('./pages/CoachDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const StudentMonthlyView = lazy(() => import('./pages/StudentMonthlyView'));
const StudentHistoryPage = lazy(() => import('./pages/StudentHistoryPage'));
const ExerciseManagement = lazy(() => import('./pages/ExerciseManagement'));
const WorkoutSessionManagement = lazy(() => import('./pages/WorkoutSessionManagement'));
const WorkoutAssignmentManagement = lazy(() => import('./pages/WorkoutAssignmentManagement'));
const CoachProgressDashboard = lazy(() => import('./pages/CoachProgressDashboard'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const StudentChatPage = lazy(() => import('./pages/StudentChatPage'));
const VideoLibrary = lazy(() => import('./pages/VideoLibrary'));
const StudentVideoLibrary = lazy(() => import('./pages/StudentVideoLibrary'));
const FinancialTracking = lazy(() => import('./pages/FinancialTracking'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

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
          return <Navigate to="/admin/dashboard" replace />;
        case 'coach':
          return <Navigate to="/coach/dashboard" replace />;
        case 'student':
          return <Navigate to="/student/dashboard" replace />;
        default:
          return <Navigate to="/dashboard" replace />;
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

                  {/* Protected Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />

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

                  {/* Admin Routes */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/exercises"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <ExerciseManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/sessions"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <WorkoutSessionManagement />
                      </ProtectedRoute>
                    }
                  />

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
