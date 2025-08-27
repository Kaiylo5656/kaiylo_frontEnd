import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, mockUser } from '../../test/test-utils';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ExerciseManagement from '../ExerciseManagement';
import { useAuth } from '../../contexts/AuthContext';

// Mock fetch
global.fetch = vi.fn();

// Mock console.error
console.error = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'fake-token'),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock the AuthContext module
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    loading: false
  })),
  AuthProvider: ({ children }) => children
}));

describe('ExerciseManagement', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Reset fetch mock
    global.fetch.mockReset();
    
    // Mock successful initial fetch for exercises
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ exercises: [] })
    });
    
    // Render the component
    renderWithProviders(<ExerciseManagement />);
  });

  it('renders the exercise management page', async () => {
    // First we should see the loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for loading to finish and content to appear
    await waitFor(() => {
      expect(screen.getByText(/Exercise Management/i)).toBeInTheDocument();
      expect(screen.getByText(/Add New Exercise/i)).toBeInTheDocument();
    });
  });

  it('opens form when add button is clicked', async () => {
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.getByText(/Add New Exercise/i)).toBeInTheDocument();
    });

    // Click the button
    const addButton = screen.getByRole('button', { name: /\+ Add New Exercise/i });
    fireEvent.click(addButton);
    
    // Check if form appears
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Add New Exercise/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Push-ups')).toBeInTheDocument();
    });
  });

  it('loads exercises on mount', async () => {
    // Mock successful API response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exercises: [
        { id: '1', title: 'Push-ups', instructions: 'Do push-ups', tags: ['chest'] },
        { id: '2', title: 'Squats', instructions: 'Do squats', tags: ['legs'] }
      ]})
    });

    // Re-render component to trigger useEffect
    renderWithProviders(<ExerciseManagement />);

    // Wait for exercises to be displayed
    await waitFor(() => {
      expect(screen.getByText('Push-ups')).toBeInTheDocument();
      expect(screen.getByText('Squats')).toBeInTheDocument();
    });

    // Verify API was called correctly
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/exercises',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer fake-token'
        })
      })
    );
  });

  it('handles exercise creation', async () => {
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.getByText(/Add New Exercise/i)).toBeInTheDocument();
    });

    // Click add button to open form
    fireEvent.click(screen.getByText(/Add New Exercise/i));

    // Mock successful API response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        exercise: {
          id: '3',
          title: 'New Exercise',
          instructions: 'Test instructions',
          tags: ['test']
        }
      })
    });

    // Fill out the form
    const titleInput = screen.getByPlaceholderText('e.g., Push-ups');
    fireEvent.change(titleInput, {
      target: { value: 'New Exercise' }
    });
    const instructionsInput = screen.getByPlaceholderText('Step-by-step instructions for performing the exercise...');
    fireEvent.change(instructionsInput, {
      target: { value: 'Test instructions' }
    });

    // Add a tag
    const tagInput = screen.getByPlaceholderText(/Press Enter to add tags/i);
    fireEvent.change(tagInput, { target: { value: 'test' } });
    fireEvent.keyPress(tagInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Submit the form
    fireEvent.click(screen.getByText(/Create Exercise/i));

    // Wait for success and verify API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/exercises',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer fake-token',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            title: 'New Exercise',
            instructions: 'Test instructions',
            tags: ['test']
          })
        })
      );
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock failed API response
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' })
    });

    // Re-render component to trigger useEffect
    renderWithProviders(<ExerciseManagement />);

    // Wait for the empty state message
    await waitFor(() => {
      expect(screen.getByText('No exercises found. Create your first exercise to get started!')).toBeInTheDocument();
    });

    // Verify that console.error was called
    expect(console.error).toHaveBeenCalledWith('Failed to fetch exercises');
  });
});
