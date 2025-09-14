import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getApiBaseUrlWithApi, buildApiUrl } from '../config/api';

// Create the authentication context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  // State for user authentication
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get API base URL dynamically
  const API_BASE_URL = getApiBaseUrlWithApi();
  console.log('🔧 AuthContext using API_BASE_URL:', API_BASE_URL);

  // Check if user is already logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Function to check if user is already authenticated
  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (token) {
        // Set the token in axios headers for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Try to get user info from backend
        const response = await axios.get(`${getApiBaseUrlWithApi()}/auth/me`);
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // If token is invalid, remove it
      localStorage.removeItem('authToken');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password, navigate) => {
    try {
      setLoading(true);
      setError(null);
      
      const loginUrl = `${getApiBaseUrlWithApi()}/auth/login`;
      console.log('🔐 Login attempt to URL:', loginUrl);
      console.log('🔐 Login data:', { email, password: password ? '[PROVIDED]' : '[MISSING]' });
      
      const response = await axios.post(loginUrl, {
        email,
        password
      });

      console.log('🔐 Login response status:', response.status);
      console.log('🔐 Login response data:', response.data);

      const { token, user } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('authToken', token);
      
      // Set token in axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Update user state
      setUser(user);
      
      // Navigate based on user role
      switch (user.role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'coach':
          navigate('/coach/dashboard');
          break;
        case 'student':
          navigate('/student/dashboard');
          break;
        default:
          navigate('/dashboard');
      }

      return { success: true };
    } catch (error) {
      console.error('🔐 Login error:', error);
      console.error('🔐 Error response:', error.response);
      console.error('🔐 Error message:', error.message);
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Register function (updated to handle invitations)
  const register = async (userData, navigate) => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      
      if (userData.role === 'student' && userData.invitationCode) {
        // Student registration with invitation
        response = await axios.post(`${getApiBaseUrlWithApi()}/invitations/accept`, {
          invitationCode: userData.invitationCode,
          name: userData.name,
          password: userData.password
        });
      } else if (userData.role === 'coach') {
        // Coach registration (direct)
        response = await axios.post(`${getApiBaseUrlWithApi()}/auth/register`, {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          role: 'coach'
        });
      } else {
        throw new Error('Invalid registration data');
      }
      
      // Check if the response has the expected structure
      if (response.data.success && response.data.token && response.data.user) {
        const { token, user } = response.data;
        
        // Store token in localStorage
        localStorage.setItem('authToken', token);
        
        // Set token in axios headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Update user state
        setUser(user);
        
        // Navigate based on user role
        switch (user.role) {
          case 'coach':
            navigate('/coach/dashboard');
            break;
          case 'student':
            navigate('/student/dashboard');
            break;
          default:
            navigate('/dashboard');
        }

        return { success: true };
      } else {
        // Handle unexpected response structure
        console.error('Unexpected response structure:', response.data);
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem('authToken');
    
    // Remove token from axios headers
    delete axios.defaults.headers.common['Authorization'];
    
    // Clear user state
    setUser(null);
    setError(null);
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.put(`${getApiBaseUrlWithApi()}/auth/profile`, userData);
      
      // Update user state with new data
      setUser(response.data.user);
      
      return { success: true, user: response.data.user };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  // Check if user is admin
  const isAdmin = () => hasRole('admin');

  // Check if user is coach
  const isCoach = () => hasRole('coach');

  // Check if user is student
  const isStudent = () => hasRole('student');

  // Get auth token function
  const getAuthToken = () => {
    console.log('🔍 Debug - getAuthToken called');
    
    // Try localStorage first
    let token = localStorage.getItem('authToken');
    console.log('🔍 Debug - localStorage token:', token ? 'Found' : 'Not found');
    
    // If not in localStorage, try sessionStorage
    if (!token) {
      token = sessionStorage.getItem('authToken');
      console.log('🔍 Debug - sessionStorage token:', token ? 'Found' : 'Not found');
    }
    
    // If still not found, try to get from axios defaults
    if (!token && axios.defaults.headers.common['Authorization']) {
      token = axios.defaults.headers.common['Authorization'].replace('Bearer ', '');
      console.log('🔍 Debug - axios defaults token:', token ? 'Found' : 'Not found');
    }
    
    console.log('🔍 Debug - Final token returned:', token ? `Length: ${token.length}` : 'No token');
    return token;
  };

  // Value object to provide to consumers
  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    hasRole,
    hasAnyRole,
    isAdmin,
    isCoach,
    isStudent,
    checkAuthStatus,
    getAuthToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
