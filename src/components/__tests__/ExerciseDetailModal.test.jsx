import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ExerciseDetailModal from '../ExerciseDetailModal';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock VideoPlayer component
vi.mock('../VideoPlayer', () => ({
  default: ({ src, className }) => (
    <div data-testid="video-player" className={className}>
      Video: {src}
    </div>
  )
}));

const mockExercise = {
  id: '1',
  title: 'Push Ups',
  instructions: 'Start in a plank position...',
  tags: ['push', 'bodyweight'],
  demoVideoURL: 'https://example.com/video.mp4',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z'
};

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ExerciseDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when not open', () => {
    renderWithRouter(
      <ExerciseDetailModal 
        isOpen={false} 
        onClose={vi.fn()} 
        exerciseId="1" 
      />
    );
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows loading state when fetching exercise', async () => {
    axios.get.mockResolvedValue({
      data: { success: true, exercise: mockExercise }
    });

    renderWithRouter(
      <ExerciseDetailModal 
        isOpen={true} 
        onClose={vi.fn()} 
        exerciseId="1" 
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Exercise Details')).toBeInTheDocument();
  });

  it('displays exercise details when loaded', async () => {
    axios.get.mockResolvedValue({
      data: { success: true, exercise: mockExercise }
    });

    renderWithRouter(
      <ExerciseDetailModal 
        isOpen={true} 
        onClose={vi.fn()} 
        exerciseId="1" 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Push Ups')).toBeInTheDocument();
      expect(screen.getByText('Start in a plank position...')).toBeInTheDocument();
      expect(screen.getByText('push')).toBeInTheDocument();
      expect(screen.getByText('bodyweight')).toBeInTheDocument();
    });
  });

  it('shows video player when demoVideoURL is present', async () => {
    axios.get.mockResolvedValue({
      data: { success: true, exercise: mockExercise }
    });

    renderWithRouter(
      <ExerciseDetailModal 
        isOpen={true} 
        onClose={vi.fn()} 
        exerciseId="1" 
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('video-player')).toBeInTheDocument();
    });
  });

  it('handles 404 error gracefully', async () => {
    axios.get.mockRejectedValue({
      response: { status: 404 }
    });

    renderWithRouter(
      <ExerciseDetailModal 
        isOpen={true} 
        onClose={vi.fn()} 
        exerciseId="1" 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Exercise not found')).toBeInTheDocument();
      expect(screen.getByText('This exercise may have been deleted.')).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    axios.get.mockResolvedValue({
      data: { success: true, exercise: mockExercise }
    });

    renderWithRouter(
      <ExerciseDetailModal 
        isOpen={true} 
        onClose={onClose} 
        exerciseId="1" 
      />
    );

    await waitFor(() => {
      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    axios.get.mockResolvedValue({
      data: { success: true, exercise: mockExercise }
    });

    renderWithRouter(
      <ExerciseDetailModal 
        isOpen={true} 
        onClose={onClose} 
        exerciseId="1" 
      />
    );

    await waitFor(() => {
      const backdrop = screen.getByRole('dialog').parentElement;
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('handles escape key to close modal', async () => {
    const onClose = vi.fn();
    axios.get.mockResolvedValue({
      data: { success: true, exercise: mockExercise }
    });

    renderWithRouter(
      <ExerciseDetailModal 
        isOpen={true} 
        onClose={onClose} 
        exerciseId="1" 
      />
    );

    await waitFor(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows empty states for missing data', async () => {
    const exerciseWithoutData = {
      ...mockExercise,
      instructions: null,
      tags: [],
      demoVideoURL: null
    };

    axios.get.mockResolvedValue({
      data: { success: true, exercise: exerciseWithoutData }
    });

    renderWithRouter(
      <ExerciseDetailModal 
        isOpen={true} 
        onClose={vi.fn()} 
        exerciseId="1" 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No instructions provided')).toBeInTheDocument();
      expect(screen.getByText('No tags assigned')).toBeInTheDocument();
    });
  });
});
