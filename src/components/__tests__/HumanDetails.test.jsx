import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import HumanDetails from '../HumanDetails';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => 'test-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock buildApiUrl
vi.mock('../config/api', () => ({
  buildApiUrl: vi.fn((path) => `http://localhost:3001${path}`),
}));

describe('HumanDetails', () => {
  const mockExercise = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Exercise',
    user_id: 'user-123',
    tags: ['push', 'chest', 'strength'],
    demoVideoURL: 'https://example.com/video.mp4',
    videoDuration: 120,
    videoSize: 2048000,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-20T14:45:00Z',
    usageCount: 5
  };

  const mockOwner = {
    id: 'user-123',
    email: 'john.doe@example.com',
    raw_user_meta_data: {
      full_name: 'John Doe'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('test-token');
  });

  it('renders loading state initially', () => {
    render(<HumanDetails exercise={mockExercise} />);
    
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('renders exercise details correctly', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { success: true, data: mockOwner }
    });

    render(<HumanDetails exercise={mockExercise} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    expect(screen.getByText('push')).toBeInTheDocument();
    expect(screen.getByText('chest')).toBeInTheDocument();
    expect(screen.getByText('strength')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('handles copy ID functionality', async () => {
    // Mock clipboard API
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<HumanDetails exercise={mockExercise} />);

    const copyButton = screen.getByTitle('Copy ID');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(mockExercise.id);
    });
  });

  it('handles copy email functionality', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { success: true, data: mockOwner }
    });

    // Mock clipboard API
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<HumanDetails exercise={mockExercise} />);

    await waitFor(() => {
      const copyButton = screen.getByTitle('Copy email');
      fireEvent.click(copyButton);
    });

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(mockOwner.email);
    });
  });

  it('shows error state when owner fetch fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('API Error'));

    render(<HumanDetails exercise={mockExercise} />);

    await waitFor(() => {
      expect(screen.getByText('Owner info unavailable')).toBeInTheDocument();
    });
  });

  it('handles exercise without data', () => {
    render(<HumanDetails exercise={null} />);
    
    expect(screen.getByText('No exercise data available')).toBeInTheDocument();
  });

  it('shows truncated tags when more than 6', () => {
    const exerciseWithManyTags = {
      ...mockExercise,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8']
    };

    render(<HumanDetails exercise={exerciseWithManyTags} />);

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag6')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('shows video as not added when no demoVideoURL', () => {
    const exerciseWithoutVideo = {
      ...mockExercise,
      demoVideoURL: null
    };

    render(<HumanDetails exercise={exerciseWithoutVideo} />);

    expect(screen.getByText('Not added')).toBeInTheDocument();
  });
});

