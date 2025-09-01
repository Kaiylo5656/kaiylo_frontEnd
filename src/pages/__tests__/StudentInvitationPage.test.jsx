import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import StudentInvitationPage from '../StudentInvitationPage';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockUseSearchParams = vi.fn(() => [new URLSearchParams(), vi.fn()]);

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    useNavigate: () => mockNavigate,
    useSearchParams: () => mockUseSearchParams()
  };
});

// Mock the AuthContext
const mockRegister = vi.fn();
vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    useAuth: () => ({
      register: mockRegister
    })
  };
});

// Mock localStorage
const mockLocalStorage = {
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Helper to render with providers
const renderWithProviders = (ui) => {
  return render(
    <AuthProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </AuthProvider>
  );
};

describe('StudentInvitationPage', () => {
  let mockAxios;

  beforeEach(async () => {
    // Get the mocked axios instance
    mockAxios = (await import('axios')).default;
    
    // Reset all mocks
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockRegister.mockClear();
    
    // Reset useSearchParams to default
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), vi.fn()]);
  });

  describe('Rendering', () => {
    test('renders invitation page with title', () => {
      renderWithProviders(<StudentInvitationPage />);
      expect(screen.getByText('Join Your Coach\'s Program')).toBeInTheDocument();
    });

    test('renders form fields', () => {
      renderWithProviders(<StudentInvitationPage />);
      expect(screen.getByPlaceholderText('Enter your 8-digit invitation code')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your full name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Create a strong password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /join program/i })).toBeInTheDocument();
    });
  });

  describe('URL Parameter Handling', () => {
    test('shows invitation code when provided in URL', async () => {
      const searchParams = new URLSearchParams('?code=ABC12345');
      mockUseSearchParams.mockReturnValue([searchParams, vi.fn()]);
      
      // Mock invitation validation
      mockAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            student_email: 'student@example.com',
            invitation_code: 'ABC12345'
          }
        }
      });
      
      renderWithProviders(<StudentInvitationPage />);
      
      // Wait for the component to process the URL parameter
      await waitFor(() => {
        expect(screen.getByText('Invitation Code Detected')).toBeInTheDocument();
      });
      
      // Check for the code text
      expect(screen.getByText(/Code:/)).toBeInTheDocument();
      expect(screen.getByText('ABC12345')).toBeInTheDocument();
    });

    test('handles missing code parameter gracefully', () => {
      const searchParams = new URLSearchParams();
      mockUseSearchParams.mockReturnValue([searchParams, vi.fn()]);
      
      renderWithProviders(<StudentInvitationPage />);
      
      const codeInput = screen.getByPlaceholderText('Enter your 8-digit invitation code');
      expect(codeInput).toBeInTheDocument();
    });
  });

  describe('Manual Code Validation', () => {
    test('validates invitation code when entered manually', async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            student_email: 'test@example.com',
            invitation_code: 'ABC12345'
          }
        }
      });

      renderWithProviders(<StudentInvitationPage />);
      
      const invitationInput = screen.getByPlaceholderText('Enter your 8-digit invitation code');
      await userEvent.type(invitationInput, 'ABC12345');
      
      // Wait for the validation to complete
      await waitFor(() => {
        expect(screen.getByText('Valid Invitation')).toBeInTheDocument();
      });
      
      // Check for the email text
      expect(screen.getByText(/You're invited to join as:/)).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    test('shows error for invalid invitation code', async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          data: {
            message: 'Invalid invitation code'
          }
        }
      });

      renderWithProviders(<StudentInvitationPage />);
      
      const invitationInput = screen.getByPlaceholderText('Enter your 8-digit invitation code');
      await userEvent.type(invitationInput, 'INVALIDC');
      
      // Wait for the error to appear
      await waitFor(() => {
        expect(screen.getByText('Invalid invitation code')).toBeInTheDocument();
      });
    });
  });

  describe('Error Display', () => {
    test('displays API errors', async () => {
      // Mock the register function to return an error
      mockRegister.mockResolvedValue({
        success: false,
        error: 'Server error occurred'
      });

      // Mock successful invitation validation first
      mockAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            student_email: 'test@example.com',
            invitation_code: 'ABC12345'
          }
        }
      });

      renderWithProviders(<StudentInvitationPage />);

      const invitationInput = screen.getByPlaceholderText('Enter your 8-digit invitation code');
      await userEvent.type(invitationInput, 'ABC12345');
      
      // Wait for invitation validation
      await waitFor(() => {
        expect(screen.getByText('Valid Invitation')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByPlaceholderText('Enter your full name');
      const passwordInput = screen.getByPlaceholderText('Create a strong password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password');
      const submitButton = screen.getByRole('button', { name: /join program/i });
      
      await userEvent.type(nameInput, 'John Doe');
      await userEvent.type(passwordInput, 'Password123');
      await userEvent.type(confirmPasswordInput, 'Password123');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Server error occurred')).toBeInTheDocument();
      });
    });
  });

  describe('Successful Registration', () => {
    test('handles successful invitation acceptance', async () => {
      // Mock successful invitation validation
      mockAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            student_email: 'student@example.com',
            invitation_code: 'ABC12345'
          }
        }
      });

      // Mock successful registration
      mockRegister.mockResolvedValue({
        success: true,
        token: 'fake-token',
        data: {
          user: {
            role: 'student',
            email: 'student@example.com'
          }
        }
      });

      renderWithProviders(<StudentInvitationPage />);

      const invitationInput = screen.getByPlaceholderText('Enter your 8-digit invitation code');
      await userEvent.type(invitationInput, 'ABC12345');
      
      // Wait for invitation validation
      await waitFor(() => {
        expect(screen.getByText('Valid Invitation')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByPlaceholderText('Enter your full name');
      const passwordInput = screen.getByPlaceholderText('Create a strong password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password');
      const submitButton = screen.getByRole('button', { name: /join program/i });
      
      await userEvent.type(nameInput, 'Test Student');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          {
            role: 'student',
            invitationCode: 'ABC12345',
            name: 'Test Student',
            password: 'TestPassword123'
          },
          mockNavigate
        );
      });
    });
  });

  describe('Form Validation', () => {
    test('requires all fields to be filled', async () => {
      renderWithProviders(<StudentInvitationPage />);
      
      const submitButton = screen.getByRole('button', { name: /join program/i });
      expect(submitButton).toBeDisabled(); // Should be disabled without valid invitation
    });

    test('validates password requirements', async () => {
      // Mock successful invitation validation
      mockAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            student_email: 'test@example.com',
            invitation_code: 'ABC12345'
          }
        }
      });

      renderWithProviders(<StudentInvitationPage />);

      const invitationInput = screen.getByPlaceholderText('Enter your 8-digit invitation code');
      await userEvent.type(invitationInput, 'ABC12345');
      
      // Wait for invitation validation
      await waitFor(() => {
        expect(screen.getByText('Valid Invitation')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByPlaceholderText('Enter your full name');
      const passwordInput = screen.getByPlaceholderText('Create a strong password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password');
      
      await userEvent.type(nameInput, 'John Doe');
      await userEvent.type(passwordInput, '123'); // Too short and no uppercase
      await userEvent.type(confirmPasswordInput, '123');
      fireEvent.click(screen.getByRole('button', { name: /join program/i }));
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Password must be at least 6 characters/)).toBeInTheDocument();
      });
    });

    test('shows password confirmation error when passwords do not match', async () => {
      // Mock successful invitation validation
      mockAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            student_email: 'test@example.com',
            invitation_code: 'ABC12345'
          }
        }
      });

      renderWithProviders(<StudentInvitationPage />);

      const invitationInput = screen.getByPlaceholderText('Enter your 8-digit invitation code');
      await userEvent.type(invitationInput, 'ABC12345');
      
      // Wait for invitation validation
      await waitFor(() => {
        expect(screen.getByText('Valid Invitation')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByPlaceholderText('Enter your full name');
      const passwordInput = screen.getByPlaceholderText('Create a strong password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password');
      
      await userEvent.type(nameInput, 'John Doe');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'DifferentPassword123');
      fireEvent.click(screen.getByRole('button', { name: /join program/i }));
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });
  });
});
