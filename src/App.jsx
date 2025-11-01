import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PWAProvider from './components/PWAProvider';
import { ModalManagerProvider } from './components/ui/modal/ModalManager';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentInvitationPage from './pages/StudentInvitationPage';
import Dashboard from './pages/Dashboard';
import CoachDashboard from './pages/CoachDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ExerciseManagement from './pages/ExerciseManagement';
import WorkoutSessionManagement from './pages/WorkoutSessionManagement';
import MainLayout from './components/MainLayout'; // Import the new layout
import LoadingSpinner from './components/LoadingSpinner';
import WorkoutAssignmentManagement from './pages/WorkoutAssignmentManagement';
import CoachProgressDashboard from './pages/CoachProgressDashboard';
import ChatPage from './pages/ChatPage';
import StudentChatPage from './pages/StudentChatPage';
import VideoLibrary from './pages/VideoLibrary';
import StudentVideoLibrary from './pages/StudentVideoLibrary';
import FinancialTracking from './pages/FinancialTracking';

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
    console.error('AuthProvider not available:', error);
    return <LoadingSpinner />;
  }
};

// Chat Route Component - conditionally renders StudentChatPage or ChatPage based on user role
const ChatRouteWrapper = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
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
      <PWAProvider>
        <ModalManagerProvider>
          <>
          <div className="App">
            <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/invite" element={<StudentInvitationPage />} />
            
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
              path="/student/history" 
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <div>Student History Page (Placeholder)</div>
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
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </>
        </ModalManagerProvider>
      </PWAProvider>
    </AuthProvider>
  );
}

export default App;
