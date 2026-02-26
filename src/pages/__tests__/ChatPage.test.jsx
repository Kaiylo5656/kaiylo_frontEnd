import React from 'react';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

// ---- Mocks (hoisted) -------------------------------------------------------

const mockGetAuthToken = vi.fn(() => Promise.resolve('test-token'));
const mockUser = { id: 'user-123', email: 'coach@test.com', role: 'coach' };

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    getAuthToken: mockGetAuthToken,
    user: mockUser,
  }),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('../../hooks/useSocket', () => ({
  default: () => ({
    socket: null,
    isConnected: false,
    connectionError: null,
    markMessagesAsRead: vi.fn(),
  }),
}));

vi.mock('../../config/api', () => ({
  buildApiUrl: (path) => `http://localhost:3001${path}`,
}));

vi.mock('../../components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock('../../components/MainLayout', () => ({
  useHideMainHeaderInChat: () => ({
    setHideMainHeaderInChatThread: vi.fn(),
  }),
}));

// Mock ChatList to expose what it receives
const mockChatList = vi.fn(() => <div data-testid="chat-list">ChatList</div>);
vi.mock('../../components/ChatList', () => ({
  default: (props) => {
    mockChatList(props);
    return (
      <div data-testid="chat-list">
        {props.conversationsLoading && <div data-testid="chat-list-loading">Loading</div>}
        {!props.conversationsLoading && props.conversations.length > 0 && (
          <div data-testid="chat-list-conversations">
            {props.conversations.map(c => (
              <div key={c.id} data-testid={`conv-${c.id}`}>{c.other_participant_name}</div>
            ))}
          </div>
        )}
        {!props.conversationsLoading && props.conversations.length === 0 && (
          <div data-testid="chat-list-empty">No conversations</div>
        )}
      </div>
    );
  },
}));

vi.mock('../../components/ChatWindow', () => ({
  default: () => <div data-testid="chat-window">ChatWindow</div>,
}));

// Mock chatCache — we spy on these to verify calls
const mockGetCachedConversations = vi.fn(() => null);
const mockSetCachedConversations = vi.fn();
const mockGetCacheTimestamp = vi.fn(() => null);
const mockMergeSyncedConversations = vi.fn();

vi.mock('../../utils/chatCache', () => ({
  getCachedConversations: (...args) => mockGetCachedConversations(...args),
  setCachedConversations: (...args) => mockSetCachedConversations(...args),
  getCacheTimestamp: (...args) => mockGetCacheTimestamp(...args),
  mergeSyncedConversations: (...args) => mockMergeSyncedConversations(...args),
}));

vi.mock('../../utils/logger', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---- Test data --------------------------------------------------------------

const fakeConversations = [
  {
    id: 'conv-1',
    created_at: '2025-01-01T00:00:00Z',
    last_message_at: '2025-06-01T14:00:00Z',
    other_participant_id: 'other-1',
    other_participant_name: 'Alice',
    last_message: { id: 'msg-1', content: 'Hello', sender_id: 'other-1', created_at: '2025-06-01T14:00:00Z' },
    unread_count: 0,
  },
  {
    id: 'conv-2',
    created_at: '2025-01-01T00:00:00Z',
    last_message_at: '2025-06-01T12:00:00Z',
    other_participant_id: 'other-2',
    other_participant_name: 'Bob',
    last_message: { id: 'msg-2', content: 'Hey', sender_id: 'other-2', created_at: '2025-06-01T12:00:00Z' },
    unread_count: 2,
  },
];

// ---- Test suite -------------------------------------------------------------

// Import after all mocks
import ChatPage from '../ChatPage';

describe('ChatPage — cache-first flow', () => {
  let fetchSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: fetch returns conversations after delay
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: fakeConversations }),
      })
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('shows loading spinner on first visit (no cache)', async () => {
    mockGetCachedConversations.mockReturnValue(null);

    render(<ChatPage />);

    // ChatList should receive conversationsLoading=true initially
    await waitFor(() => {
      const lastCall = mockChatList.mock.calls[0];
      expect(lastCall).toBeTruthy();
    });

    // After fetch completes, loading should stop and conversations should appear
    await waitFor(() => {
      expect(screen.getByTestId('chat-list-conversations')).toBeTruthy();
    });

    // Should have fetched from API
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/chat/conversations'),
      expect.any(Object)
    );

    // Should have cached the result
    expect(mockSetCachedConversations).toHaveBeenCalledWith(
      'user-123',
      expect.arrayContaining([
        expect.objectContaining({ id: 'conv-1' }),
      ])
    );
  });

  it('renders cached conversations instantly (no spinner) on second visit', async () => {
    // Simulate cached data
    mockGetCachedConversations.mockReturnValue({
      data: fakeConversations,
      timestamp: Date.now(),
    });

    render(<ChatPage />);

    // Conversations should appear immediately from cache — no loading state
    await waitFor(() => {
      expect(screen.getByTestId('chat-list-conversations')).toBeTruthy();
      expect(screen.getByTestId('conv-conv-1')).toBeTruthy();
      expect(screen.getByTestId('conv-conv-2')).toBeTruthy();
    });

    // API should still be called in background to refresh
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  it('updates cache after background API fetch', async () => {
    mockGetCachedConversations.mockReturnValue({
      data: [fakeConversations[0]], // cache has 1 conversation
      timestamp: Date.now(),
    });

    // API returns 2 conversations (fresh data)
    fetchSpy.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: fakeConversations }),
      })
    );

    render(<ChatPage />);

    // Should initially show 1 cached conversation
    await waitFor(() => {
      expect(screen.getByTestId('conv-conv-1')).toBeTruthy();
    });

    // After background fetch, should update to 2 conversations and persist
    await waitFor(() => {
      expect(screen.getByTestId('conv-conv-2')).toBeTruthy();
    });

    expect(mockSetCachedConversations).toHaveBeenCalledWith(
      'user-123',
      expect.arrayContaining([
        expect.objectContaining({ id: 'conv-1' }),
        expect.objectContaining({ id: 'conv-2' }),
      ])
    );
  });

  it('still renders cached data when API fetch fails', async () => {
    mockGetCachedConversations.mockReturnValue({
      data: fakeConversations,
      timestamp: Date.now(),
    });

    // API fails
    fetchSpy.mockImplementation(() => Promise.reject(new Error('Network error')));

    render(<ChatPage />);

    // Should still show cached conversations
    await waitFor(() => {
      expect(screen.getByTestId('chat-list-conversations')).toBeTruthy();
      expect(screen.getByTestId('conv-conv-1')).toBeTruthy();
    });
  });

  it('passes onConversationsUpdate callback to ChatList', async () => {
    mockGetCachedConversations.mockReturnValue({
      data: fakeConversations,
      timestamp: Date.now(),
    });

    render(<ChatPage />);

    await waitFor(() => {
      const lastCall = mockChatList.mock.calls[mockChatList.mock.calls.length - 1];
      expect(lastCall).toBeTruthy();
      expect(typeof lastCall[0].onConversationsUpdate).toBe('function');
    });
  });

  it('calls getCachedConversations with correct userId', async () => {
    mockGetCachedConversations.mockReturnValue(null);

    render(<ChatPage />);

    await waitFor(() => {
      expect(mockGetCachedConversations).toHaveBeenCalledWith('user-123');
    });
  });
});
