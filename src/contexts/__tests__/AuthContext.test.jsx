import React from 'react';
import { describe, it, beforeEach, beforeAll, afterAll, afterEach, expect, vi } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';

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
  onAuthStateChange: vi.fn(),
  updateUser: vi.fn(() => Promise.resolve({ data: { user: {} }, error: null }))
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

// ---------------------------------------------------------------------------
// AuthContext — language sync on session resolve (Phase 09 Plan 01)
// ---------------------------------------------------------------------------

describe('AuthContext language sync', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleLogSpy;
  let i18nextRef;
  let changeLanguageSpy;
  let authStateChangeHandler;

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

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    // Reset shared mocks
    axiosMock.mockReset();
    axiosMock.mockImplementation(() => Promise.resolve({ data: {} }));
    axiosMock.get.mockReset();
    axiosMock.get.mockResolvedValue(resolvedUser);
    axiosMock.post.mockReset();
    axiosMock.put.mockReset();
    axiosMock.defaults.headers.common = {};
    axiosMock.interceptors.response.use.mockClear();
    axiosMock.interceptors.response.use.mockReturnValue(Symbol('interceptor'));
    axiosMock.interceptors.response.eject.mockClear();

    supabaseAuth.getSession.mockReset();
    supabaseAuth.refreshSession.mockReset();
    supabaseAuth.setSession.mockReset();
    supabaseAuth.signOut.mockClear();
    supabaseAuth.updateUser.mockReset();
    supabaseAuth.updateUser.mockResolvedValue({ data: { user: {} }, error: null });
    supabaseAuth.onAuthStateChange.mockReset();

    // Capture the SIGNED_IN handler so each test can fire events at will.
    authStateChangeHandler = null;
    supabaseAuth.onAuthStateChange.mockImplementation((cb) => {
      authStateChangeHandler = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    supabaseAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    supabaseAuth.refreshSession.mockResolvedValue({ data: { session: null }, error: null });
    supabaseAuth.setSession.mockResolvedValue({ data: { session: null }, error: null });

    // Reset i18next to FR before each test.
    const i18next = (await import('i18next')).default;
    i18nextRef = i18next;
    await act(async () => {
      await i18next.changeLanguage('fr');
    });
    changeLanguageSpy = vi.spyOn(i18next, 'changeLanguage');
  });

  afterEach(() => {
    if (changeLanguageSpy) changeLanguageSpy.mockRestore();
  });

  const makeSession = (metadata, opts = {}) => ({
    access_token: 'access-1',
    refresh_token: 'refresh-1',
    user: {
      id: opts.id || 'user-1',
      email: 'u@example.com',
      created_at: opts.created_at || new Date().toISOString(),
      user_metadata: metadata,
    },
  });

  it('Test A: session with user_metadata.language=en triggers changeLanguage("en") and no updateUser', async () => {
    renderWithAuthProvider();

    // Wait for AuthProvider mount + onAuthStateChange registration
    await waitFor(() => expect(authStateChangeHandler).toBeTruthy());

    await act(async () => {
      await authStateChangeHandler('SIGNED_IN', makeSession({ language: 'en', role: 'coach' }));
    });

    expect(i18nextRef.language).toBe('en');
    expect(localStorage.getItem('kaiyloLanguage')).toBe('en');
    expect(supabaseAuth.updateUser).not.toHaveBeenCalled();
  });

  it('Test B: session with no user_metadata.language on an OLD user forces fr + fires one fr write-back', async () => {
    renderWithAuthProvider();
    await waitFor(() => expect(authStateChangeHandler).toBeTruthy());

    // navigator.language is en-US in jsdom by default sometimes — irrelevant here;
    // the AuthContext effect is the source of truth post-session-resolve.
    const oldUserSession = makeSession(
      { role: 'coach' }, // language ABSENT
      { created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() } // 1h ago
    );

    await act(async () => {
      await authStateChangeHandler('SIGNED_IN', oldUserSession);
    });

    expect(i18nextRef.language).toBe('fr');
    expect(localStorage.getItem('kaiyloLanguage')).toBe('fr');
    expect(supabaseAuth.updateUser).toHaveBeenCalledTimes(1);
    expect(supabaseAuth.updateUser).toHaveBeenCalledWith({ data: { language: 'fr' } });
  });

  it('Test C: when the fr write-back rejects, no exception escapes', async () => {
    supabaseAuth.updateUser.mockRejectedValueOnce(new Error('network down'));
    renderWithAuthProvider();
    await waitFor(() => expect(authStateChangeHandler).toBeTruthy());

    const oldUserSession = makeSession(
      {},
      { created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() }
    );

    // Must not throw
    await expect(act(async () => {
      await authStateChangeHandler('SIGNED_IN', oldUserSession);
    })).resolves.toBeUndefined();

    expect(i18nextRef.language).toBe('fr');
  });

  it('Test D: on SIGNED_OUT, language is NOT changed and localStorage is preserved', async () => {
    localStorage.setItem('kaiyloLanguage', 'en');
    await act(async () => {
      await i18nextRef.changeLanguage('en');
    });

    renderWithAuthProvider();
    await waitFor(() => expect(authStateChangeHandler).toBeTruthy());

    // Re-spy after the changeLanguage('en') above to count fresh calls only.
    changeLanguageSpy.mockClear();
    supabaseAuth.updateUser.mockClear();

    await act(async () => {
      await authStateChangeHandler('SIGNED_OUT', null);
    });

    expect(changeLanguageSpy).not.toHaveBeenCalled();
    expect(supabaseAuth.updateUser).not.toHaveBeenCalled();
    expect(localStorage.getItem('kaiyloLanguage')).toBe('en');
  });

  it('Test E: the same session does not double-fire changeLanguage on repeat SIGNED_IN', async () => {
    renderWithAuthProvider();
    await waitFor(() => expect(authStateChangeHandler).toBeTruthy());

    const session = makeSession({ language: 'en', role: 'coach' }, { id: 'stable-user' });

    await act(async () => {
      await authStateChangeHandler('SIGNED_IN', session);
    });
    const firstCount = changeLanguageSpy.mock.calls.length;

    // Re-fire the same session ref
    await act(async () => {
      await authStateChangeHandler('SIGNED_IN', session);
    });

    expect(changeLanguageSpy.mock.calls.length).toBe(firstCount);
  });

  it('Test F (Rule-2 deviation): new user (created < 30s ago) with absent language does NOT get fr write-back', async () => {
    // This is the signup-path safety net: AuthContext must defer to the
    // signup-path write rather than racing it with a fr-fallback.
    renderWithAuthProvider();
    await waitFor(() => expect(authStateChangeHandler).toBeTruthy());

    const freshSignupSession = makeSession(
      {}, // no language yet — signup path will write it
      { created_at: new Date().toISOString() } // just-now
    );

    await act(async () => {
      await authStateChangeHandler('SIGNED_IN', freshSignupSession);
    });

    expect(supabaseAuth.updateUser).not.toHaveBeenCalled();
  });
});
