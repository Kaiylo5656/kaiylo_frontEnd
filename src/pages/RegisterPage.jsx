import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const RegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [invitationData, setInvitationData] = useState(null);
  const [invitationError, setInvitationError] = useState(null);
  const { register: registerUser } = useAuth();
  const API_BASE_URL = 'http://localhost:3001/api';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationCode = searchParams.get('code');

  // Form handling with react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
    setValue
  } = useForm();

  // Watch password for confirmation validation
  const password = watch('password');

  // Check invitation code on component mount
  useState(() => {
    if (invitationCode) {
      validateInvitationCode(invitationCode);
    }
  }, [invitationCode]);

  // Validate invitation code
  const validateInvitationCode = async (code) => {
    try {
      const response = await axios.get(`http://localhost:3001/api/invitations/validate/${code}`);
      if (response.data.success) {
        setInvitationData(response.data.data);
        setValue('email', response.data.data.student_email);
        setInvitationError(null);
      }
    } catch (error) {
      setInvitationError(error.response?.data?.message || 'Invalid invitation code');
      setInvitationData(null);
    }
  };

  // Handle invitation code input
  const handleInvitationCodeChange = async (e) => {
    const code = e.target.value.trim();
    if (code.length === 8) {
      await validateInvitationCode(code);
    } else {
      setInvitationData(null);
      setInvitationError(null);
    }
  };

  // Handle form submission
  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      let result;

      // Coach registration
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'coach'
      }).catch(error => {
        console.error('Registration error:', error);
        throw new Error(error.response?.data?.message || 'Registration failed. Please try again.');
      });
      
      result = response.data;
      
      if (result.success) {
        // Redirect based on user role
        switch (result.user.role) {
          case 'coach':
            navigate('/coach/dashboard');
            break;
          case 'student':
            navigate('/student/dashboard');
            break;
          default:
            navigate('/dashboard');
        }
      } else {
        // Set form error
        setError('root', {
          type: 'manual',
          message: result.error
        });
      }
    } catch (error) {
      setError('root', {
        type: 'manual',
        message: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Coach Registration
          </h1>
          <p className="text-gray-600">
            Create your coach account to start managing workout programs
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                {...register('name', {
                  required: 'Full name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters'
                  }
                })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Hidden Role Field - Always Coach */}
            <input type="hidden" {...register('role')} value="coach" />

            {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            {/* Password fields follow */}

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
                  }
                })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Create a strong password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: value => value === password || 'Passwords do not match'
                })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Root Error Display */}
            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{errors.root.message}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Information Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">How to Join Kaiylo</h3>
          <div className="text-xs text-blue-700 space-y-2">
            <p>Register as a coach to create and manage workout programs for your students.</p>
            <p>After registration, you can invite your students via email from your dashboard.</p>
            <p><strong>Note:</strong> Students can only join through coach invitations.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
