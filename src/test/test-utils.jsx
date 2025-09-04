import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { createContext } from 'react';
import { vi } from 'vitest';

// Create a mock AuthContext
const AuthContext = createContext(null);

// Mock auth context values
const mockAuthContext = {
  user: {
    id: '123',
    email: 'test@example.com',
    name: 'Test Coach',
    role: 'coach'
  },
  loading: false,
  error: null,
  login: vi.fn().mockResolvedValue({ success: true }),
  register: vi.fn().mockResolvedValue({ success: true }),
  logout: vi.fn(),
  updateProfile: vi.fn().mockResolvedValue({ success: true }),
  hasRole: (role) => role === 'coach',
  hasAnyRole: (roles) => roles.includes('coach'),
  isAdmin: () => false,
  isCoach: () => true,
  isStudent: () => false,
  checkAuthStatus: vi.fn().mockResolvedValue(true)
};

// Mock AuthContext.Provider
const MockAuthProvider = ({ children }) => (
  <AuthContext.Provider value={mockAuthContext}>
    {children}
  </AuthContext.Provider>
);

// Custom render function that includes providers
export function renderWithProviders(ui, { route = '/' } = {}) {
  window.history.pushState({}, 'Test page', route);

  return render(
    <BrowserRouter>
      <MockAuthProvider>
        {ui}
      </MockAuthProvider>
    </BrowserRouter>
  );
}

// Mock user data for testing
export const mockUser = {
  id: '123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'coach'
};

// Re-export everything
export * from '@testing-library/react';
