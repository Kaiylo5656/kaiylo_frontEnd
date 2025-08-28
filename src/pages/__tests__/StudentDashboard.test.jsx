import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import StudentDashboard from '../StudentDashboard';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the global fetch
global.fetch = vi.fn();

// Mock AuthContext for a student user
vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    useAuth: () => ({
      user: { name: 'Test Student', role: 'student' },
    }),
  };
});

// Helper to render with providers
const renderWithProviders = (ui) => {
  return render(
    <AuthProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </AuthProvider>
  );
};

describe('StudentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dashboard and fetches assigned sessions', async () => {
    const mockAssignments = [
      { 
        id: 'as1', 
        session_id: 'ses1',
        status: 'pending', 
        created_at: new Date().toISOString(),
        session: { title: 'Morning Workout', description: 'A workout for the morning.' },
        coach: { email: 'coach@test.com' }
      }
    ];

    // Mock the fetch for assignments
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ assignments: mockAssignments }),
    });

    renderWithProviders(<StudentDashboard />);

    // Check for title and assignment
    expect(await screen.findByText('Student Dashboard')).toBeInTheDocument();
    expect(await screen.findByText('Morning Workout')).toBeInTheDocument();
    expect(screen.getByText('Assigned by: coach@test.com')).toBeInTheDocument();
  });

  it('shows an empty state message when there are no assigned sessions', async () => {
    // Mock the fetch for an empty list of assignments
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ assignments: [] }),
    });

    renderWithProviders(<StudentDashboard />);

    // Check for the empty state message
    expect(await screen.findByText('No sessions assigned')).toBeInTheDocument();
  });

  it('opens the session details modal when "View Details" is clicked', async () => {
    const mockAssignment = { 
      id: 'as1', 
      session_id: 'ses1',
      status: 'pending', 
      created_at: new Date().toISOString(),
      session: { title: 'Detailed Workout', description: 'Full details here.' },
      coach: { email: 'coach@test.com' }
    };
    
    const mockSessionDetails = {
      id: 'ses1',
      title: 'Detailed Workout',
      description: 'Full details here.',
      exercises: [{ exercise: { name: 'Push-ups' }, sets: 3, reps: 10, rest: 60, rpe: 7 }]
    };

    // Mock the initial fetch for assignments, then the fetch for session details
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ assignments: [mockAssignment] }),
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSessionDetails),
    });

    renderWithProviders(<StudentDashboard />);

    // Click the "View Details" button
    const viewButton = await screen.findByRole('button', { name: /View Details/i });
    await userEvent.click(viewButton);

    // Check that the modal content is visible
    expect(await screen.findByText('Push-ups')).toBeInTheDocument();
    expect(screen.getByText('Sets:')).toBeInTheDocument();
  });
});
