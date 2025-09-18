import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import VideoLibrary from './pages/VideoLibrary';
import FinancialTracking from './pages/FinancialTracking';
import ConnectionStatus from './components/ConnectionStatus';

import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
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

  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
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
            
            {/* Chat Route */}
            <Route 
              path="/chat" 
              element={
                <ProtectedRoute allowedRoles={['coach', 'student']}>
                  <ChatPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
        <ConnectionStatus />
      </Router>
    </AuthProvider>
  );
}

export default App;
