import React from 'react';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';

// --- Mocks ------------------------------------------------------------------
const axiosMock = vi.hoisted(() => {
  const mock = vi.fn(() => Promise.resolve({ data: {} }));
  mock.get = vi.fn();
  mock.post = vi.fn();
  mock.put = vi.fn();
  mock.defaults = { headers: { common: {} } };
  mock.interceptors = {
    response: {
      use: vi.fn(() => Symbol('interceptor')),
      eject: vi.fn()
    }
  };
  return mock;
});

vi.mock('axios', () => ({ default: axiosMock }));

const supabaseAuth = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  setSession: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
  onAuthStateChange: vi.fn()
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: supabaseAuth }))
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

// Import after mocks
import { AuthProvider, useAuth } from '../AuthContext.jsx';

// Helper to capture context value
const renderWithAuthProvider = () => {
  let capturedContext;

  const Capture = () => {
    capturedContext = useAuth();
    return null;
  };

  render(
    <AuthProvider>
      <Capture />
    </AuthProvider>
  );

  if (!capturedContext) {
    throw new Error('Auth context not captured');
  }

  return capturedContext;
};

const resolvedUser = { data: { user: { id: 'coach-id', role: 'coach' } } };

describe('AuthContext refreshAuthToken', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleLogSpy;

  beforeAll(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    // Reset axios mocks
    axiosMock.mockReset();
    axiosMock.mockImplementation(() => Promise.resolve({ data: {} }));
    axiosMock.get.mockReset();
    axiosMock.get.mockResolvedValue(resolvedUser);
    axiosMock.post.mockReset();
    axiosMock.post.mockResolvedValue({ data: { token: 'backend-token', user: resolvedUser.data.user } });
    axiosMock.put.mockReset();
    axiosMock.put.mockResolvedValue({ data: { user: resolvedUser.data.user } });
    axiosMock.defaults.headers.common = {};
    axiosMock.interceptors.response.use.mockClear();
    axiosMock.interceptors.response.use.mockReturnValue(Symbol('interceptor'));
    axiosMock.interceptors.response.eject.mockClear();

    // Reset Supabase mocks
    supabaseAuth.getSession.mockReset();
    supabaseAuth.refreshSession.mockReset();
    supabaseAuth.setSession.mockReset();
    supabaseAuth.signOut.mockClear();
    supabaseAuth.onAuthStateChange.mockReset();
    supabaseAuth.onAuthStateChange.mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    }));

    // Default Supabase behaviour: no active session
    const emptySession = { data: { session: null }, error: null };
    supabaseAuth.getSession.mockResolvedValue(emptySession);
    supabaseAuth.refreshSession.mockResolvedValue({ data: { session: null }, error: null });
    supabaseAuth.setSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('persists tokens when Supabase already returns an active session', async () => {
    // First call for initial auth check returns null, second call (refresh) returns session
    supabaseAuth.getSession
      .mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockResolvedValueOnce({
        data: { session: { access_token: 'token-123', refresh_token: 'refresh-123' } },
        error: null
      });

    const { refreshAuthToken } = renderWithAuthProvider();

    await act(async () => {
      await refreshAuthToken();
    });

    expect(localStorage.getItem('authToken')).toBe('token-123');
    expect(localStorage.getItem('supabaseRefreshToken')).toBe('refresh-123');
    expect(axiosMock.defaults.headers.common.Authorization).toBe('Bearer token-123');
    expect(supabaseAuth.setSession).not.toHaveBeenCalled();
    expect(supabaseAuth.refreshSession).not.toHaveBeenCalledWith({ refresh_token: expect.anything() });
  });

  it('rehydrates session from stored Supabase tokens when getSession is empty', async () => {
    const storedSession = {
      currentSession: {
        access_token: 'stored-access',
        refresh_token: 'stored-refresh'
      }
    };
    localStorage.setItem('sb-auth-token', JSON.stringify(storedSession));
    localStorage.setItem('supabaseRefreshToken', 'stored-refresh');

    supabaseAuth.setSession.mockResolvedValueOnce({
      data: { session: { access_token: 'rehydrated-token', refresh_token: 'rehydrated-refresh' } },
      error: null
    });

    const { refreshAuthToken } = renderWithAuthProvider();

    await act(async () => {
      await refreshAuthToken();
    });

    expect(supabaseAuth.setSession).toHaveBeenCalledWith({
      access_token: 'stored-access',
      refresh_token: 'stored-refresh'
    });
    expect(localStorage.getItem('authToken')).toBe('rehydrated-token');
    expect(localStorage.getItem('supabaseRefreshToken')).toBe('rehydrated-refresh');
    expect(supabaseAuth.refreshSession).not.toHaveBeenCalled();
  });

  it('falls back to refreshSession when rehydration fails but a refresh token is stored', async () => {
    localStorage.setItem('supabaseRefreshToken', 'legacy-refresh');

    supabaseAuth.setSession.mockResolvedValueOnce({ data: null, error: { message: 'invalid session' } });
    supabaseAuth.refreshSession.mockResolvedValueOnce({
      data: { session: { access_token: 'fresh-token', refresh_token: 'fresh-refresh' } },
      error: null
    });

    const { refreshAuthToken } = renderWithAuthProvider();

    await act(async () => {
      await refreshAuthToken();
    });

    expect(supabaseAuth.setSession).toHaveBeenCalled();
    expect(supabaseAuth.refreshSession).toHaveBeenCalledWith({ refresh_token: 'legacy-refresh' });
    expect(localStorage.getItem('authToken')).toBe('fresh-token');
    expect(localStorage.getItem('supabaseRefreshToken')).toBe('fresh-refresh');
    expect(supabaseAuth.signOut).not.toHaveBeenCalled();
  });
});
