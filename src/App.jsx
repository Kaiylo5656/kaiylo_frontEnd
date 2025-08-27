import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import CoachDashboard from './pages/CoachDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ExerciseManagement from './pages/ExerciseManagement';
import WorkoutSessionManagement from './pages/WorkoutSessionManagement';
import Navigation from './components/Navigation';
import LoadingSpinner from './components/LoadingSpinner';
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
    <>
      <Navigation />
      {children}
    </>
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
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
