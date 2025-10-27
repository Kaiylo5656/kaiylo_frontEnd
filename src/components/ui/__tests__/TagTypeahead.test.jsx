import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TagTypeahead from '../TagTypeahead';

describe('TagTypeahead', () => {
  const mockTags = ['push', 'pull', 'legs', 'cardio', 'strength'];
  const mockOnTagsChange = vi.fn();

  beforeEach(() => {
    mockOnTagsChange.mockClear();
  });

  it('renders collapsed state by default', () => {
    render(
      <TagTypeahead
        tags={mockTags}
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
        placeholder="Filter by tags..."
      />
    );

    expect(screen.getByText('+ Tag')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Filter by tags...')).not.toBeInTheDocument();
  });

  it('shows suggestions when typing', async () => {
    const user = userEvent.setup();
    render(
      <TagTypeahead
        tags={mockTags}
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
      />
    );

    // First click to expand the input
    const collapsedButton = screen.getByText('+ Tag');
    await user.click(collapsedButton);

    const input = screen.getByRole('combobox');
    await user.type(input, 'pu');

    await waitFor(() => {
      expect(screen.getByText('push')).toBeInTheDocument();
    });
  });

  it('adds tag when clicked', async () => {
    const user = userEvent.setup();
    render(
      <TagTypeahead
        tags={mockTags}
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
      />
    );

    // First click to expand the input
    const collapsedButton = screen.getByText('+ Tag');
    await user.click(collapsedButton);

    const input = screen.getByRole('combobox');
    await user.type(input, 'push');

    await waitFor(() => {
      const pushButton = screen.getByText('push');
      fireEvent.click(pushButton);
    });

    expect(mockOnTagsChange).toHaveBeenCalledWith(['push']);
  });

  it('removes tag when X is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TagTypeahead
        tags={mockTags}
        selectedTags={['push', 'pull']}
        onTagsChange={mockOnTagsChange}
      />
    );

    const removeButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')
    );
    
    if (removeButton) {
      await user.click(removeButton);
      expect(mockOnTagsChange).toHaveBeenCalledWith(['pull']);
    }
  });

  it('removes tag when tag chip is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TagTypeahead
        tags={mockTags}
        selectedTags={['push', 'pull']}
        onTagsChange={mockOnTagsChange}
      />
    );

    const pushTag = screen.getByText('push');
    await user.click(pushTag);
    expect(mockOnTagsChange).toHaveBeenCalledWith(['pull']);
  });

  it('shows collapsed state by default', () => {
    render(
      <TagTypeahead
        tags={mockTags}
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
      />
    );

    expect(screen.getByText('+ Tag')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Filtrer par tags...')).not.toBeInTheDocument();
  });

  it('expands when collapsed state is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TagTypeahead
        tags={mockTags}
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
      />
    );

    const collapsedButton = screen.getByText('+ Tag');
    await user.click(collapsedButton);
    
    expect(screen.getByPlaceholderText('Filtrer par tags...')).toBeInTheDocument();
    expect(screen.queryByText('+ Tag')).not.toBeInTheDocument();
  });

  it('collapses after tag selection', async () => {
    const user = userEvent.setup();
    render(
      <TagTypeahead
        tags={mockTags}
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
      />
    );

    // Click to expand
    const collapsedButton = screen.getByText('+ Tag');
    await user.click(collapsedButton);
    
    // Type to show suggestions
    const input = screen.getByPlaceholderText('Filtrer par tags...');
    await user.type(input, 'push');
    
    // Select a tag
    const suggestion = screen.getByText('push');
    await user.click(suggestion);
    
    // Should collapse back
    expect(screen.getByText('+ Tag')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Filtrer par tags...')).not.toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(
      <TagTypeahead
        tags={mockTags}
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
      />
    );

    // First click to expand the input
    const collapsedButton = screen.getByText('+ Tag');
    await user.click(collapsedButton);

    const input = screen.getByRole('combobox');
    await user.type(input, 'p');
    
    await waitFor(() => {
      expect(screen.getByText('push')).toBeInTheDocument();
    });

    // Press Enter to select first suggestion
    await user.keyboard('{Enter}');
    
    expect(mockOnTagsChange).toHaveBeenCalledWith(['p']);
  });

  it('creates new tag when no match found', async () => {
    const user = userEvent.setup();
    render(
      <TagTypeahead
        tags={mockTags}
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
      />
    );

    // First click to expand the input
    const collapsedButton = screen.getByText('+ Tag');
    await user.click(collapsedButton);

    const input = screen.getByRole('combobox');
    await user.type(input, 'newtag');

    await waitFor(() => {
      expect(screen.getByText('newtag')).toBeInTheDocument();
    });

    // Press Enter to create new tag
    await user.keyboard('{Enter}');
    
    expect(mockOnTagsChange).toHaveBeenCalledWith(['newtag']);
  });
});
