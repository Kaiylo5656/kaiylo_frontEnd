import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import RegisterPage from '../RegisterPage';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// Mock the AuthContext
vi.mock('../../contexts/AuthContext', async (importOriginal) => {
    const mod = await importOriginal();
    return {
      ...mod,
      useAuth: () => ({
        register: vi.fn()
      })
    };
});

// Helper to render with providers, including AuthProvider
const renderWithProviders = (ui) => {
  return render(
    <AuthProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </AuthProvider>
  );
};

describe('RegisterPage', () => {
  let axios;

  beforeEach(async () => {
    // Dynamically import the mocked axios to use in tests
    axios = (await import('axios')).default;
    vi.clearAllMocks();
  });

  it('renders coach registration correctly', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByText('Coach Registration')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your full name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
  });

  it('shows validation errors for invalid form data', async () => {
    renderWithProviders(<RegisterPage />);
    
    // Try to submit without filling required fields
    await userEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    
    expect(await screen.findByText('Full name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('shows password confirmation error when passwords do not match', async () => {
    renderWithProviders(<RegisterPage />);
    
    // Fill out the form with mismatched passwords
    await userEvent.type(screen.getByLabelText(/Full Name/i), 'Test Coach');
    await userEvent.type(screen.getByLabelText(/Email Address/i), 'coach@example.com');
    await userEvent.type(screen.getByLabelText(/^Password$/i), 'TestPassword123');
    await userEvent.type(screen.getByLabelText(/Confirm Password/i), 'DifferentPassword123');
    
    await userEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  });

  it('handles coach registration successfully and navigates', async () => {
    // Mock successful registration
    axios.post.mockResolvedValue({
      data: {
        success: true,
        user: { role: 'coach', email: 'coach@example.com' },
        token: 'fake-token'
      }
    });

    renderWithProviders(<RegisterPage />);
    
    // Fill out the form
    await userEvent.type(screen.getByLabelText(/Full Name/i), 'Test Coach');
    await userEvent.type(screen.getByLabelText(/Email Address/i), 'coach@example.com');
    await userEvent.type(screen.getByLabelText(/^Password$/i), 'TestPassword123');
    await userEvent.type(screen.getByLabelText(/Confirm Password/i), 'TestPassword123');
    
    // Submit the form
    await userEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    
    // Check API call
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/register',
        expect.objectContaining({
          name: 'Test Coach',
          email: 'coach@example.com',
          role: 'coach'
        })
      );
    });

    // Check that navigation was called correctly
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/coach/dashboard');
    });
  });
});
