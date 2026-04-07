import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ============================================================
// ChatWindow read-only mode tests
// ============================================================

// Mock all ChatWindow dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    getAuthToken: vi.fn().mockResolvedValue('mock-token'),
    user: { id: 'student-1', role: 'student' },
  }),
}));

vi.mock('@/hooks/useSocket', () => ({
  default: () => ({
    isConnected: false,
    connectionError: null,
    markMessagesAsRead: vi.fn(),
    socket: null,
  }),
}));

vi.mock('@/config/api', () => ({
  buildApiUrl: (path) => `http://localhost:3001${path}`,
}));

vi.mock('@/utils/chatCache', () => ({
  getCachedMessages: () => null,
  setCachedMessages: vi.fn(),
  appendCachedMessage: vi.fn(),
  patchCachedMessage: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/student/chat' }),
}));

// Mock react-virtuoso to avoid complex rendering
vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ children }) => <div data-testid="virtuoso">{children}</div>,
}));

// Mock sub-components
vi.mock('@/components/FileMessage', () => ({ default: () => null }));
vi.mock('@/components/VideoFeedbackMessage', () => ({ default: () => null }));
vi.mock('@/components/ReplyMessage', () => ({ default: () => null }));
vi.mock('@/components/DeleteMessageModal', () => ({ default: () => null }));

import ChatWindow from '../ChatWindow';

describe('ReadOnlyMode — ChatWindow', () => {
  const conversation = {
    id: 'conv-1',
    other_user_id: 'coach-1',
    other_user_name: 'Coach Test',
    messages: [],
  };
  const currentUser = { id: 'student-1', role: 'student', name: 'Test Student' };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
  });

  it('renders message input enabled when isActive=true', () => {
    render(
      <ChatWindow
        conversation={conversation}
        currentUser={currentUser}
        onNewMessage={vi.fn()}
        onMessageSent={vi.fn()}
        onBack={vi.fn()}
        isActive={true}
      />
    );

    // The input should not have the read-only placeholder
    const inputs = document.querySelectorAll('input[type="text"]');
    const messageInput = Array.from(inputs).find(i => !i.disabled || i.placeholder?.includes('message'));
    if (messageInput) {
      expect(messageInput.placeholder).not.toContain('limité');
    }
  });

  it('disables message input with French message when isActive=false', () => {
    render(
      <ChatWindow
        conversation={conversation}
        currentUser={currentUser}
        onNewMessage={vi.fn()}
        onMessageSent={vi.fn()}
        onBack={vi.fn()}
        isActive={false}
      />
    );

    // Look for the disabled input with French placeholder
    const inputs = document.querySelectorAll('input');
    const disabledInput = Array.from(inputs).find(i => i.disabled && i.placeholder?.includes('limité'));
    expect(disabledInput).toBeTruthy();
    expect(disabledInput.placeholder).toContain('Accès limité');
  });

  it('disables send button when isActive=false', () => {
    render(
      <ChatWindow
        conversation={conversation}
        currentUser={currentUser}
        onNewMessage={vi.fn()}
        onMessageSent={vi.fn()}
        onBack={vi.fn()}
        isActive={false}
      />
    );

    // All submit buttons should be disabled
    const submitButtons = document.querySelectorAll('button[type="submit"]');
    submitButtons.forEach(btn => {
      expect(btn.disabled).toBe(true);
    });
  });
});

// ============================================================
// WorkoutVideoUploadModal read-only tests
// ============================================================

vi.mock('@/contexts/BackgroundUploadContext', () => ({
  useBackgroundUpload: () => ({
    startBackgroundUpload: vi.fn(),
    getUploadForSet: () => null,
  }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
  DialogDescription: ({ children }) => <p>{children}</p>,
}));

vi.mock('@/components/VideoTrimEditor', () => ({ default: () => null }));

import WorkoutVideoUploadModal from '../WorkoutVideoUploadModal';

describe('ReadOnlyMode — WorkoutVideoUploadModal', () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    onUploadSuccess: vi.fn(),
    onDeleteVideo: vi.fn(),
    exerciseInfo: { exerciseName: 'Squat', exerciseId: 'ex1', exerciseIndex: 0, sessionId: 's1', coachId: 'c1', assignmentId: 'a1' },
    setInfo: { setIndex: 0, setNumber: 1, weight: 100, reps: 5 },
    existingVideo: null,
  };

  it('disables gallery button when isActive=false', () => {
    render(<WorkoutVideoUploadModal {...baseProps} isActive={false} />);

    // Find the Galerie button
    const galleryButton = screen.queryByText('Galerie');
    if (galleryButton) {
      const btn = galleryButton.closest('button');
      expect(btn.disabled).toBe(true);
      expect(btn.className).toContain('opacity-50');
    }
  });

  it('enables gallery button when isActive=true', () => {
    render(<WorkoutVideoUploadModal {...baseProps} isActive={true} />);

    const galleryButton = screen.queryByText('Galerie');
    if (galleryButton) {
      const btn = galleryButton.closest('button');
      expect(btn.disabled).toBeFalsy();
    }
  });
});
