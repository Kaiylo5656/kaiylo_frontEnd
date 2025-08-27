import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Custom render function that includes providers
export function renderWithProviders(ui, { route = '/' } = {}) {
  window.history.pushState({}, 'Test page', route);

  return render(
    <BrowserRouter>
      {ui}
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
