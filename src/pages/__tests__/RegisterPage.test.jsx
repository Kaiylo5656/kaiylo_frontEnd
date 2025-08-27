import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders } from '../../test/test-utils';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from '../RegisterPage';
import { useAuth } from '../../contexts/AuthContext';

// Mock axios
const mockAxios = {
  get: vi.fn(),
  post: vi.fn()
};
vi.mock('axios', () => ({
  default: mockAxios
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockUseSearchParams = vi.fn(() => [new URLSearchParams(), vi.fn()]);

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useSearchParams: () => mockUseSearchParams()
}));

// Mock the AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    register: vi.fn()
  }))
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), vi.fn()]);
  });

  it('renders coach registration by default', () => {
    renderWithProviders(<RegisterPage />);
    
    expect(screen.getByText('Coach Registration')).toBeInTheDocument();
    expect(screen.getByText('Create your coach account to start managing workout programs')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your full name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('switches to student registration when student button is clicked', () => {
    renderWithProviders(<RegisterPage />);
    
    const studentButton = screen.getByText("I'm a Student");
    fireEvent.click(studentButton);
    
    expect(screen.getByText('Student Registration')).toBeInTheDocument();
    expect(screen.getByText('Join your coach\'s fitness program')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your 8-digit invitation code')).toBeInTheDocument();
    expect(screen.getByText('Join Program')).toBeInTheDocument();
  });

  it('switches back to coach registration when coach button is clicked', () => {
    renderWithProviders(<RegisterPage />);
    
    // Switch to student first
    const studentButton = screen.getByText("I'm a Student");
    fireEvent.click(studentButton);
    
    // Switch back to coach
    const coachButton = screen.getByText("I'm a Coach");
    fireEvent.click(coachButton);
    
    expect(screen.getByText('Coach Registration')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('shows student registration when invitation code is in URL', () => {
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
    
    renderWithProviders(<RegisterPage />);
    
    expect(screen.getByText('Student Registration')).toBeInTheDocument();
    expect(screen.getByText('student@example.com')).toBeInTheDocument();
  });

  it('validates invitation code when entered manually', async () => {
    renderWithProviders(<RegisterPage />);
    
    // Switch to student registration
    const studentButton = screen.getByText("I'm a Student");
    fireEvent.click(studentButton);
    
    // Mock successful validation
    mockAxios.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          student_email: 'test@example.com',
          invitation_code: 'ABC12345'
        }
      }
    });
    
    const invitationInput = screen.getByPlaceholderText('Enter your 8-digit invitation code');
    fireEvent.change(invitationInput, { target: { value: 'ABC12345' } });
    
    await waitFor(() => {
      expect(screen.getByText('✓ Valid invitation code')).toBeInTheDocument();
    });
  });

  it('shows error for invalid invitation code', async () => {
    renderWithProviders(<RegisterPage />);
    
    // Switch to student registration
    const studentButton = screen.getByText("I'm a Student");
    fireEvent.click(studentButton);
    
    // Mock failed validation
    mockAxios.get.mockRejectedValue({
      response: {
        data: {
          message: 'Invalid invitation code'
        }
      }
    });
    
    const invitationInput = screen.getByPlaceholderText('Enter your 8-digit invitation code');
    fireEvent.change(invitationInput, { target: { value: 'INVALID' } });
    
    await waitFor(() => {
      expect(screen.getByText('Invalid invitation code')).toBeInTheDocument();
    });
  });

  it('handles coach registration successfully', async () => {
    renderWithProviders(<RegisterPage />);
    
    // Mock successful registration
    mockAxios.post.mockResolvedValue({
      data: {
        success: true,
        user: {
          role: 'coach',
          email: 'coach@example.com'
        }
      }
    });
    
    // Fill out the form
    fireEvent.change(screen.getByPlaceholderText('Enter your full name'), {
      target: { value: 'Test Coach' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { value: 'coach@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('Create a strong password'), {
      target: { value: 'TestPassword123' }
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
      target: { value: 'TestPassword123' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Account'));
    
    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/register',
        {
          name: 'Test Coach',
          email: 'coach@example.com',
          password: 'TestPassword123',
          role: 'coach'
        }
      );
      expect(mockNavigate).toHaveBeenCalledWith('/coach/dashboard');
    });
  });

  it('handles student registration successfully', async () => {
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
    
    // Mock successful student registration
    mockAxios.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          user: {
            role: 'student',
            email: 'student@example.com'
          }
        }
      }
    });
    
    renderWithProviders(<RegisterPage />);
    
    // Fill out the form
    fireEvent.change(screen.getByPlaceholderText('Enter your full name'), {
      target: { value: 'Test Student' }
    });
    fireEvent.change(screen.getByPlaceholderText('Create a strong password'), {
      target: { value: 'TestPassword123' }
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
      target: { value: 'TestPassword123' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Join Program'));
    
    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/invitations/accept',
        {
          invitationCode: 'ABC12345',
          name: 'Test Student',
          password: 'TestPassword123'
        }
      );
      expect(mockNavigate).toHaveBeenCalledWith('/student/dashboard');
    });
  });

  it('shows validation errors for invalid form data', async () => {
    renderWithProviders(<RegisterPage />);
    
    // Try to submit without filling required fields
    fireEvent.click(screen.getByText('Create Account'));
    
    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('shows password confirmation error when passwords do not match', async () => {
    renderWithProviders(<RegisterPage />);
    
    // Fill out the form with mismatched passwords
    fireEvent.change(screen.getByPlaceholderText('Enter your full name'), {
      target: { value: 'Test Coach' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { value: 'coach@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('Create a strong password'), {
      target: { value: 'TestPassword123' }
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
      target: { value: 'DifferentPassword123' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Account'));
    
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('disables submit button for student registration without valid invitation', () => {
    renderWithProviders(<RegisterPage />);
    
    // Switch to student registration
    const studentButton = screen.getByText("I'm a Student");
    fireEvent.click(studentButton);
    
    // Submit button should be disabled
    const submitButton = screen.getByText('Join Program');
    expect(submitButton).toBeDisabled();
  });
});
