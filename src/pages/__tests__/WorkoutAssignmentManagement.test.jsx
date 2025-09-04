import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import WorkoutAssignmentManagement from '../WorkoutAssignmentManagement';
import { renderWithProviders } from '../../test/test-utils';

// Mock axios
vi.mock('axios');

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'mock-token'),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('WorkoutAssignmentManagement', () => {
  const mockStudents = [
    { id: '1', name: 'Test Student 1', email: 'student1@test.com' },
    { id: '2', name: 'Test Student 2', email: 'student2@test.com' }
  ];

  const mockWorkoutSessions = [
    { id: '1', title: 'Workout 1', status: 'published' },
    { id: '2', title: 'Workout 2', status: 'published' },
    { id: '3', title: 'Draft Workout', status: 'draft' } // This shouldn't appear in dropdown
  ];

  const mockAssignments = [
    {
      id: '1',
      student_id: '1',
      workout_session_id: '1',
      status: 'assigned',
      due_date: '2024-01-01',
      assigned_at: '2023-12-01'
    }
  ];

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Setup default axios responses
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/coach/students')) {
        return Promise.resolve({ data: { success: true, data: mockStudents } });
      }
      if (url.includes('/api/sessions')) {
        return Promise.resolve({ data: { sessions: mockWorkoutSessions } });
      }
      if (url.includes('/api/assignments/coach')) {
        return Promise.resolve({ data: { success: true, data: mockAssignments } });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  it('renders without crashing', async () => {
    renderWithProviders(<WorkoutAssignmentManagement />);
    expect(screen.getByText('Workout Assignment Management')).toBeInTheDocument();
  });

  it('loads and displays students and workout sessions', async () => {
    renderWithProviders(<WorkoutAssignmentManagement />);

    // Wait for data to load
    await waitFor(() => {
      // Use more specific queries
      const studentSelect = screen.getByLabelText('Student *');
      const workoutSelect = screen.getByLabelText('Workout Session *');
      
      expect(studentSelect).toBeInTheDocument();
      expect(workoutSelect).toBeInTheDocument();
      
      // Check options are loaded
      expect(studentSelect.querySelector('option[value="1"]')).toHaveTextContent('Test Student 1');
      expect(workoutSelect.querySelector('option[value="1"]')).toHaveTextContent('Workout 1');
    });

    // Verify only published workouts are shown
    const workoutSelect = screen.getByLabelText('Workout Session *');
    const options = Array.from(workoutSelect.querySelectorAll('option'));
    expect(options.some(opt => opt.textContent === 'Draft Workout')).toBe(false);
  });

  it('displays error message when API calls fail', async () => {
    // Mock API failure
    axios.get.mockRejectedValue(new Error('API Error'));

    renderWithProviders(<WorkoutAssignmentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch assignments')).toBeInTheDocument();
    });
  });

  it('handles form submission successfully', async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<WorkoutAssignmentManagement />);

    // Wait for data to load and get form elements
    const form = await waitFor(() => screen.getByRole('form', { name: /assign workout/i }));
    const studentSelect = await screen.findByLabelText(/student \*/i);
    const workoutSelect = await screen.findByLabelText(/workout session \*/i);
    const dueDateInput = await screen.findByLabelText(/due date/i);
    const notesInput = await screen.findByLabelText(/notes/i);
    const submitButton = await screen.findByRole('button', { name: /assign workout/i });

    // Fill out form
    await user.selectOptions(studentSelect, '1');
    await user.selectOptions(workoutSelect, '1');
    await user.type(dueDateInput, '2024-01-01');
    await user.type(notesInput, 'Test notes');

    // Submit form
    await user.click(submitButton);

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/workout assigned successfully/i)).toBeInTheDocument();
    });

    // Verify the API was called with correct data
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/assignments'),
      expect.objectContaining({
        studentId: '1',
        workoutSessionId: '1',
        dueDate: '2024-01-01',
        notes: 'Test notes'
      }),
      expect.any(Object)
    );
  });

  it('handles assignment deletion', async () => {
    const user = userEvent.setup();
    axios.delete.mockResolvedValue({ data: { success: true } });
    
    renderWithProviders(<WorkoutAssignmentManagement />);

    // Wait for assignments to load
    const assignmentsList = await waitFor(() => screen.getByRole('table'));
    const deleteButton = await screen.findByRole('button', { name: /delete/i });

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(() => true);

    // Click delete button
    await user.click(deleteButton);

    // Verify confirmation was shown
    expect(confirmSpy).toHaveBeenCalled();

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/assignment deleted successfully/i)).toBeInTheDocument();
    });

    // Verify the API was called with correct ID
    expect(axios.delete).toHaveBeenCalledWith(
      expect.stringContaining('/api/assignments/1'),
      expect.any(Object)
    );

    confirmSpy.mockRestore();
  });

  it('cancels deletion when user declines confirmation', async () => {
    renderWithProviders(<WorkoutAssignmentManagement />);

    // Wait for assignments to load
    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(() => false);

    // Click delete button
    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    await userEvent.click(deleteButton);

    // Verify axios.delete was not called
    expect(axios.delete).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('validates required fields on form submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkoutAssignmentManagement />);

    // Wait for data to load
    await waitFor(() => {
      const studentSelect = screen.getByLabelText(/student \*/i);
      const workoutSelect = screen.getByLabelText(/workout session \*/i);
      expect(studentSelect).toBeInTheDocument();
      expect(workoutSelect).toBeInTheDocument();
    });
    
    // Find the submit button - it shows "Assign Workout" when data is loaded
    const submitButton = screen.getByRole('button', { name: /assign workout/i });
    const studentSelect = screen.getByLabelText(/student \*/i);
    const workoutSelect = screen.getByLabelText(/workout session \*/i);

    // Try to submit empty form (button might be disabled, but we test validation)
    await user.click(submitButton);

    // Check for HTML5 validation messages
    expect(studentSelect).toBeInvalid();
    expect(workoutSelect).toBeInvalid();

    // Verify no API call was made
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('displays loading state during API calls', async () => {
    // Make API calls take some time
    axios.get.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderWithProviders(<WorkoutAssignmentManagement />);

    // Check for loading indicators
    expect(screen.getByText('Loading assignments...')).toBeInTheDocument();
  });
});