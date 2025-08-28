import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ExerciseManagement from '../ExerciseManagement';
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

describe('ExerciseManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm for delete tests
    window.confirm = vi.fn(() => true);
  });

  it('renders the main page with title and add button', async () => {
    // Mock the initial fetch for an empty list of exercises
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ exercises: [] }),
    });
    renderWithProviders(<ExerciseManagement />);
    expect(await screen.findByText('Exercise Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add New Exercise/i })).toBeInTheDocument();
  });

  it('opens and closes the "Add New Exercise" form', async () => {
    // Mock the initial fetch for an empty list
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ exercises: [] }),
    });
    renderWithProviders(<ExerciseManagement />);
    const addButton = await screen.findByRole('button', { name: /Add New Exercise/i });
    await userEvent.click(addButton);
    expect(await screen.findByText('Add New Exercise')).toBeInTheDocument();
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await userEvent.click(cancelButton);
    await waitFor(() => {
      expect(screen.queryByText('Add New Exercise')).not.toBeInTheDocument();
    });
  });

  it('allows a coach to create a new exercise', async () => {
    // Mock initial empty list, then successful creation, then refetch of empty list
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ exercises: [] }) }) // Initial load
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) }) // POST request
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ exercises: [] }) }); // Refetch after creation

    renderWithProviders(<ExerciseManagement />);
    const addButton = await screen.findByRole('button', { name: /Add New Exercise/i });
    await userEvent.click(addButton);

    // Fill out and submit the form
    await userEvent.type(screen.getByPlaceholderText('e.g., Push-ups'), 'Chest Press');
    await userEvent.type(screen.getByPlaceholderText('Step-by-step instructions for performing the exercise...'), '1. Lie down. 2. Press up.');
    const createButton = screen.getByRole('button', { name: /Create Exercise/i });
    await userEvent.click(createButton);

    // Verify the POST request
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/exercises',
        expect.objectContaining({ method: 'POST' })
      );
    });
    expect(screen.queryByText('Add New Exercise')).not.toBeInTheDocument();
  });

  it('allows a coach to edit an existing exercise', async () => {
    const mockExercise = { id: '123', title: 'Old Title', instructions: 'Old instructions', tags: [] };
    // Mock initial load with one exercise, then successful update, then refetch
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ exercises: [mockExercise] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ exercises: [{...mockExercise, title: 'New Updated Title'}] }) });

    renderWithProviders(<ExerciseManagement />);
    const editButton = await screen.findByRole('button', { name: /Edit/i });
    await userEvent.click(editButton);

    const titleInput = await screen.findByPlaceholderText('e.g., Push-ups');
    expect(titleInput.value).toBe('Old Title');

    // Change the title and submit
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New Updated Title');
    const updateButton = screen.getByRole('button', { name: /Update Exercise/i });
    await userEvent.click(updateButton);

    // Verify the PATCH request
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3001/api/exercises/${mockExercise.id}`,
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  it('allows a coach to delete an exercise', async () => {
    const mockExercise = { id: '456', title: 'To Be Deleted', instructions: 'delete me', tags: [] };
    // Mock initial load, then successful delete, then refetch of empty list
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ exercises: [mockExercise] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ exercises: [] }) });
    
    renderWithProviders(<ExerciseManagement />);
    const deleteButton = await screen.findByRole('button', { name: /Delete/i });
    await userEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this exercise?');

    // Verify the DELETE request
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3001/api/exercises/${mockExercise.id}`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('filters the exercise list based on search term', async () => {
    const mockExercises = [
      { id: '1', title: 'Bench Press', instructions: 'Lie down and press.', tags: [] },
      { id: '2', title: 'Squat', instructions: 'Go down and up.', tags: [] },
      { id: '3', title: 'Deadlift', instructions: 'Lift the bar.', tags: [] },
    ];
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ exercises: mockExercises }),
    });

    renderWithProviders(<ExerciseManagement />);

    // Check that all exercises are visible initially
    expect(await screen.findByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByText('Deadlift')).toBeInTheDocument();

    // Type into the search box
    const searchInput = screen.getByPlaceholderText('Search exercises by title...');
    await userEvent.type(searchInput, 'press');

    // Check that only the matching exercise is visible
    await waitFor(() => {
      expect(screen.getByText('Bench Press')).toBeInTheDocument();
      expect(screen.queryByText('Squat')).not.toBeInTheDocument();
      expect(screen.queryByText('Deadlift')).not.toBeInTheDocument();
    });
  });
});
