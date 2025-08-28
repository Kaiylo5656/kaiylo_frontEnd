import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const StudentInvitationPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [invitationData, setInvitationData] = useState(null);
  const [invitationError, setInvitationError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const API_BASE_URL = 'http://localhost:3001/api';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationCode = searchParams.get('code');
  const { register: registerUser } = useAuth(); // Use the register function from AuthContext

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
  useEffect(() => {
    if (invitationCode) {
      validateInvitationCode(invitationCode);
    }
  }, [invitationCode]);

  // Validate invitation code
  const validateInvitationCode = async (code) => {
    setIsValidating(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/invitations/validate/${code}`);
      if (response.data.success) {
        setInvitationData(response.data.data);
        setValue('email', response.data.data.student_email);
        setInvitationError(null);
      }
    } catch (error) {
      setInvitationError(error.response?.data?.message || 'Invalid invitation code');
      setInvitationData(null);
    } finally {
      setIsValidating(false);
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
    
    const registrationData = {
      role: 'student',
      invitationCode: invitationCode || data.invitationCode,
      name: data.name,
      password: data.password,
    };

    const result = await registerUser(registrationData);

    if (result.success) {
      // The context now has the correct user. Navigation should work correctly.
      navigate('/student/dashboard');
    } else {
      setError('root', {
        type: 'manual',
        message: result.error || 'An unexpected error occurred. Please try again.'
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Join Your Coach's Program
          </h1>
          <p className="text-gray-600">
            Complete your registration to access your personalized workout program
          </p>
        </div>

        {/* Invitation Status */}
        {invitationCode && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Invitation Code Detected
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Code: <span className="font-mono">{invitationCode}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Invitation Code Field (if not in URL) */}
            {!invitationCode && (
              <div>
                <label htmlFor="invitationCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Invitation Code
                </label>
                <input
                  id="invitationCode"
                  type="text"
                  {...register('invitationCode', {
                    required: 'Invitation code is required',
                    minLength: {
                      value: 8,
                      message: 'Invitation code must be 8 characters'
                    },
                    maxLength: {
                      value: 8,
                      message: 'Invitation code must be 8 characters'
                    }
                  })}
                  onChange={handleInvitationCodeChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.invitationCode ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your 8-digit invitation code"
                  maxLength={8}
                />
                {errors.invitationCode && (
                  <p className="mt-1 text-sm text-red-600">{errors.invitationCode.message}</p>
                )}
                {invitationError && (
                  <p className="mt-1 text-sm text-red-600">{invitationError}</p>
                )}
                {isValidating && (
                  <p className="mt-1 text-sm text-blue-600">Validating invitation code...</p>
                )}
              </div>
            )}

            {/* Invitation Validation Status */}
            {invitationData && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Valid Invitation
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      You're invited to join as: <span className="font-medium">{invitationData.student_email}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

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

            {/* Email Field (read-only if from invitation) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                value={invitationData?.student_email || ''}
                readOnly={!!invitationData}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                placeholder="Email will be set from invitation"
              />
              <p className="mt-1 text-sm text-gray-500">
                Email is automatically set from your invitation
              </p>
            </div>

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
              disabled={isLoading || !invitationData || isValidating}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isLoading || !invitationData || isValidating
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
                'Join Program'
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in here
              </a>
            </p>
          </div>
        </div>

        {/* Information Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">How Student Registration Works</h3>
          <div className="text-xs text-blue-700 space-y-2">
            <p>Students can only join Kaiylo through invitations from their coaches.</p>
            <p>If you don't have an invitation code, please contact your coach to receive one.</p>
            <p><strong>Note:</strong> Each invitation code can only be used once.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentInvitationPage;
