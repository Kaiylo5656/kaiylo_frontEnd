import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import WorkoutSessionManagement from '../WorkoutSessionManagement';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the global fetch
global.fetch = vi.fn();

// Mock AuthContext
vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    useAuth: () => ({
      user: { name: 'Test Coach', role: 'coach' },
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

describe('WorkoutSessionManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows a coach to create a new workout session', async () => {
    // Mock API calls for initial data load (empty sessions, one exercise)
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ sessions: [] }),
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ exercises: [{ id: 'ex1', name: 'Push-ups' }] }),
    });

    renderWithProviders(<WorkoutSessionManagement />);

    // Open the form
    const createButton = await screen.findByRole('button', { name: /Create New Session/i });
    await userEvent.click(createButton);

    // Fill out session details
    await userEvent.type(screen.getByPlaceholderText('e.g., Upper Body Strength'), 'Full Body Workout');
    await userEvent.type(screen.getByPlaceholderText('Brief description of the workout session...'), 'A complete workout.');

    // Add an exercise
    const addExerciseButton = screen.getByRole('button', { name: /Add Exercise/i });
    await userEvent.click(addExerciseButton);

    // Select the exercise from the dropdown. We use findAllByRole because there's also a "Status" dropdown.
    // The exercise dropdown will be the second one on the form.
    const allComboboxes = await screen.findAllByRole('combobox');
    const exerciseSelect = allComboboxes[1];
    await userEvent.selectOptions(exerciseSelect, 'ex1');

    // Mock the fetch call for the POST request
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    
    // Mock the refetch after creation
    fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: [] }),
      }).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ exercises: [{ id: 'ex1', name: 'Push-ups' }] }),
      });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Create Session/i });
    await userEvent.click(submitButton);

    // Verify the POST request
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/sessions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'Full Body Workout',
            description: 'A complete workout.',
            generalObjective: '',
            exercises: [
              { exerciseId: 'ex1', sets: 3, reps: 10, rest: 60, rpe: 7, notes: '' }
            ],
            status: 'draft'
          })
        })
      );
    });
  });
 
  it('allows a coach to edit an existing workout session', async () => {
    const mockSession = { 
      id: 'ses1', 
      title: 'Old Session Title', 
      description: 'Old desc', 
      general_objective: 'Old obj', 
      exercises: [], 
      status: 'draft' 
    };

    // Mock initial data load, the PATCH, and the final refetch
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ sessions: [mockSession] }) }) // Initial sessions
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ exercises: [] }) }) // Initial exercises
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) }) // PATCH session
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ sessions: [] }) }) // Refetch sessions
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ exercises: [] }) }); // Refetch exercises

    renderWithProviders(<WorkoutSessionManagement />);

    const editButton = await screen.findByRole('button', { name: /Edit/i });
    await userEvent.click(editButton);

    const titleInput = await screen.findByDisplayValue('Old Session Title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New Session Title');
    
    const updateButton = screen.getByRole('button', { name: /Update Session/i });
    await userEvent.click(updateButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3001/api/sessions/${mockSession.id}`,
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  it('allows a coach to delete a workout session', async () => {
    const mockSession = { id: 'ses2', title: 'To Be Deleted' };
    
    // Mock initial load, the DELETE, and the final refetch
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ sessions: [mockSession] }) }) // Initial sessions
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ exercises: [] }) }) // Initial exercises
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) }) // DELETE session
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ sessions: [] }) }) // Refetch sessions
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ exercises: [] }) }); // Refetch exercises
    
    window.confirm = vi.fn(() => true);

    renderWithProviders(<WorkoutSessionManagement />);

    const deleteButton = await screen.findByRole('button', { name: /Delete/i });
    await userEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this session?');

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3001/api/sessions/${mockSession.id}`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('allows a coach to publish a draft session', async () => {
    const mockSession = { id: 'ses3', title: 'Draft Session', status: 'draft' };

    // Mock initial load, the PATCH, and the final refetch
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ sessions: [mockSession] }) }) // Initial sessions
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ exercises: [] }) }) // Initial exercises
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) }) // PATCH session
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ sessions: [{ ...mockSession, status: 'published' }] }) }) // Refetch sessions
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ exercises: [] }) }); // Refetch exercises

    renderWithProviders(<WorkoutSessionManagement />);

    const publishButton = await screen.findByRole('button', { name: /Publish/i });
    await userEvent.click(publishButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3001/api/sessions/${mockSession.id}/publish`,
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });
});
