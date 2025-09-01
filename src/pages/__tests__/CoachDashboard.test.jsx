import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'fake-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock window.confirm
const mockConfirm = vi.fn();
Object.defineProperty(window, 'confirm', { value: mockConfirm });

// Mock window.alert
const mockAlert = vi.fn();
Object.defineProperty(window, 'alert', { value: mockAlert });

// Mock navigator.clipboard
const mockClipboard = {
  writeText: vi.fn(),
};
Object.defineProperty(navigator, 'clipboard', { value: mockClipboard });

const renderWithProviders = (ui) => {
  return render(
    <AuthProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </AuthProvider>
  );
};

describe('CoachDashboard', () => {
  const mockInvitations = [
    { 
      id: 1, 
      student_email: 'student1@test.com', 
      status: 'pending', 
      invitation_code: 'CODE1', 
      created_at: new Date().toISOString(), 
      expires_at: new Date(Date.now() + 86400000).toISOString() 
    },
    { 
      id: 2, 
      student_email: 'student2@test.com', 
      status: 'accepted', 
      invitation_code: 'CODE2', 
      created_at: new Date().toISOString(), 
      expires_at: new Date(Date.now() + 86400000).toISOString() 
    }
  ];

  const mockStudents = [
    { id: '1', name: 'John Doe', email: 'john@test.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@test.com' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);
    mockAlert.mockClear();
    mockClipboard.writeText.mockResolvedValue();
  });

  it('renders the dashboard with coach name and stats', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockInvitations,
      },
    });

    renderWithProviders(<CoachDashboard />);

    // Wait for the component to render and data to load
    await waitFor(() => {
      expect(screen.getByText('Coach Dashboard')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Check for welcome message
    await waitFor(() => {
      expect(screen.getByText(/Welcome/)).toBeInTheDocument();
    }, { timeout: 10000 });
    
    // Check stats
    await waitFor(() => {
      expect(screen.getByText('Pending Invitations')).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);

  it('displays a list of invitations', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockInvitations,
      },
    });

    renderWithProviders(<CoachDashboard />);

    // Wait for the invitations to load and display
    await waitFor(() => {
      expect(screen.getByText('student1@test.com')).toBeInTheDocument();
    }, { timeout: 10000 });

    await waitFor(() => {
      expect(screen.getByText('CODE1')).toBeInTheDocument();
    }, { timeout: 10000 });

    await waitFor(() => {
      expect(screen.getByText('student2@test.com')).toBeInTheDocument();
    }, { timeout: 10000 });

    await waitFor(() => {
      expect(screen.getByText('CODE2')).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);

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
    }, { timeout: 10000 });
  }, 15000);

  it('opens invitation modal when Invite Student button is clicked', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockInvitations,
      },
    });

    renderWithProviders(<CoachDashboard />);

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Coach Dashboard')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Find and click the Invite Student button
    const inviteButton = screen.getByText('Invite Student');
    await userEvent.click(inviteButton);

    // Check if modal opens
    await waitFor(() => {
      expect(screen.getByText('Invite a Student')).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);

  it('submits invitation form successfully', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockInvitations,
      },
    });

    axios.post.mockResolvedValue({
      data: {
        success: true,
        message: 'Invitation sent successfully',
      },
    });

    renderWithProviders(<CoachDashboard />);

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Coach Dashboard')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Open modal
    const inviteButton = screen.getByText('Invite Student');
    await userEvent.click(inviteButton);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Invite a Student')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Fill form
    const emailInput = screen.getByPlaceholderText('student@example.com');
    await userEvent.type(emailInput, 'newstudent@test.com');

    const messageInput = screen.getByPlaceholderText('Add a personal message to your invitation...');
    await userEvent.type(messageInput, 'Welcome to my program!');

    // Submit form
    const submitButton = screen.getByText('Send Invitation');
    await userEvent.click(submitButton);

    // Check if API was called with the correct endpoint
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('http://localhost:3001/api/invitations/create', {
        studentEmail: 'newstudent@test.com',
        message: 'Welcome to my program!',
      }, {
        headers: {
          'Authorization': 'Bearer fake-token',
          'Content-Type': 'application/json',
        },
      });
    }, { timeout: 10000 });
  }, 20000);

  it('closes modal when cancel is clicked', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockInvitations,
      },
    });

    renderWithProviders(<CoachDashboard />);

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Coach Dashboard')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Open modal
    const inviteButton = screen.getByText('Invite Student');
    await userEvent.click(inviteButton);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Invite a Student')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Click the close button (×) instead of Cancel
    const closeButton = screen.getByText('×');
    await userEvent.click(closeButton);

    // Check if modal closes
    await waitFor(() => {
      expect(screen.queryByText('Invite a Student')).not.toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);

  it('displays students list', async () => {
    // Clear all mocks first to ensure fresh state
    vi.clearAllMocks();
    
    // Mock both API calls using mockImplementation for more reliable handling
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/invitations/coach')) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockInvitations,
          },
        });
      }
      if (url.includes('/api/coach/students')) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockStudents,
          },
        });
      }
      return Promise.reject(new Error('Unexpected URL: ' + url));
    });

    renderWithProviders(<CoachDashboard />);

    // Wait for students to load - look for the student name in the card structure
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    }, { timeout: 10000 });

    await waitFor(() => {
      expect(screen.getByText('jane@test.com')).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);

  it('filters students by search term', async () => {
    // Clear all mocks first to ensure fresh state
    vi.clearAllMocks();
    
    // Mock both API calls using mockImplementation
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/invitations/coach')) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockInvitations,
          },
        });
      }
      if (url.includes('/api/coach/students')) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockStudents,
          },
        });
      }
      return Promise.reject(new Error('Unexpected URL: ' + url));
    });

    renderWithProviders(<CoachDashboard />);

    // Wait for students to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Find and fill the search input
    const searchInput = screen.getByPlaceholderText('Search students by name or email...');
    await userEvent.type(searchInput, 'John');

    // Check that only John Doe is visible
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);

  it('removes a student successfully', async () => {
    // Clear all mocks first to ensure fresh state
    vi.clearAllMocks();
    
    // Mock both API calls using mockImplementation
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/invitations/coach')) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockInvitations,
          },
        });
      }
      if (url.includes('/api/coach/students')) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockStudents,
          },
        });
      }
      return Promise.reject(new Error('Unexpected URL: ' + url));
    });

    // Mock the remove student API call
    axios.delete.mockResolvedValue({
      data: {
        success: true,
        message: 'Student removed successfully',
      },
    });

    renderWithProviders(<CoachDashboard />);

    // Wait for students to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Find and click the remove button for John Doe
    const removeButtons = screen.getAllByText('Remove');
    await userEvent.click(removeButtons[0]);

    // Check if the confirmation was called
    expect(mockConfirm).toHaveBeenCalled();
    
    // Verify API call was made
    expect(axios.delete).toHaveBeenCalledWith(
      'http://localhost:3001/api/coach/students/1',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer fake-token'
        })
      })
    );
  }, 15000);

  it('copies invitation link to clipboard', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockInvitations,
      },
    });

    renderWithProviders(<CoachDashboard />);

    // Wait for invitations to load
    await waitFor(() => {
      expect(screen.getByText('student1@test.com')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Find and click copy link button
    const copyButtons = screen.getAllByText('Copy Link');
    await userEvent.click(copyButtons[0]);

    // Check if clipboard API was called
    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled();
    }, { timeout: 10000 });
  }, 15000);

  it('cancels invitation', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockInvitations,
      },
    });

    // Mock the actual cancel invitation endpoint - uses DELETE method
    axios.delete.mockResolvedValue({
      data: {
        success: true,
        message: 'Invitation cancelled successfully',
      },
    });

    renderWithProviders(<CoachDashboard />);

    // Wait for invitations to load
    await waitFor(() => {
      expect(screen.getByText('student1@test.com')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Find and click cancel button (use getAllByText to handle multiple Cancel buttons)
    const cancelButtons = screen.getAllByText('Cancel');
    await userEvent.click(cancelButtons[0]);

    // Check if API was called with the correct method and endpoint
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        'http://localhost:3001/api/invitations/cancel/1',
        {
          headers: {
            'Authorization': 'Bearer fake-token'
          }
        }
      );
    }, { timeout: 10000 });
  }, 15000);

  it('handles API errors gracefully', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<CoachDashboard />);

    // Wait for the component to render even with error
    await waitFor(() => {
      expect(screen.getByText('Coach Dashboard')).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);

  it('handles invitation creation error', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockInvitations,
      },
    });

    axios.post.mockRejectedValue(new Error('Failed to send invitation'));

    renderWithProviders(<CoachDashboard />);

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Coach Dashboard')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Open modal
    const inviteButton = screen.getByText('Invite Student');
    await userEvent.click(inviteButton);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Invite a Student')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Fill and submit form
    const emailInput = screen.getByPlaceholderText('student@example.com');
    await userEvent.type(emailInput, 'newstudent@test.com');

    const submitButton = screen.getByText('Send Invitation');
    await userEvent.click(submitButton);

    // Component should handle error gracefully
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    }, { timeout: 10000 });
  }, 15000);
});
