import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import CoachDashboard from '../CoachDashboard';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock axios
vi.mock('axios');

// Mock AuthContext
vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    useAuth: () => ({
      user: { name: 'Test Coach', role: 'coach' },
      logout: vi.fn(),
    }),
  };
});

const renderWithProviders = (ui) => {
  return render(
    <AuthProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </AuthProvider>
  );
};

describe('CoachDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dashboard with coach name and stats', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          { id: 1, student_email: 'student1@test.com', status: 'pending', invitation_code: 'CODE1', created_at: new Date().toISOString(), expires_at: new Date().toISOString() },
          { id: 2, student_email: 'student2@test.com', status: 'accepted', invitation_code: 'CODE2', created_at: new Date().toISOString(), expires_at: new Date().toISOString() },
        ],
      },
    });

    renderWithProviders(<CoachDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Coach Dashboard')).toBeInTheDocument();
    });

    // The text "Welcome, Test Coach" is split across elements. This flexible matcher finds
    // the innermost element containing the text, which prevents matching parent containers.
    const welcomeMessage = screen.getByText((content, element) => {
      const hasText = node => node.textContent.startsWith('Welcome, Test Coach');
      const elementHasText = hasText(element);
      const childrenDontHaveText = Array.from(element.children).every(child => !hasText(child));
      return elementHasText && childrenDontHaveText;
    });
    expect(welcomeMessage).toBeInTheDocument();
    
    // Check stats
    await waitFor(() => {
        expect(screen.getByText('Pending Invitations')).toBeInTheDocument();
        // The count of pending invitations
        expect(screen.getByText('1')).toBeInTheDocument();
      });
  });

  it('displays a list of invitations', async () => {
    const mockInvitations = [
      { id: 1, student_email: 'student1@test.com', status: 'pending', invitation_code: 'CODE1', created_at: new Date().toISOString(), expires_at: new Date().toISOString() },
      { id: 2, student_email: 'student2@test.com', status: 'accepted', invitation_code: 'CODE2', created_at: new Date().toISOString(), expires_at: new Date().toISOString() },
    ];

    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockInvitations,
      },
    });

    renderWithProviders(<CoachDashboard />);

    await waitFor(() => {
      expect(screen.getByText('student1@test.com')).toBeInTheDocument();
      expect(screen.getByText('CODE1')).toBeInTheDocument();
      expect(screen.getByText('student2@test.com')).toBeInTheDocument();
      expect(screen.getByText('CODE2')).toBeInTheDocument();
    });
  });

  it('shows an empty state message when there are no invitations', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });

    renderWithProviders(<CoachDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No invitations yet. Invite your first student!')).toBeInTheDocument();
    });
  });
});
