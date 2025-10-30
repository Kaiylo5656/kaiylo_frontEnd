import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ValidatedTick from '../ValidatedTick';

describe('ValidatedTick', () => {
  it('renders unchecked state correctly', () => {
    render(<ValidatedTick checked={false} onChange={vi.fn()} />);
    
    const button = screen.getByRole('checkbox');
    expect(button).toHaveAttribute('aria-checked', 'false');
    expect(button).toHaveAttribute('aria-label', 'Marquer comme validé');
  });

  it('renders checked state correctly', () => {
    render(<ValidatedTick checked={true} onChange={vi.fn()} />);
    
    const button = screen.getByRole('checkbox');
    expect(button).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange when clicked', () => {
    const mockOnChange = vi.fn();
    render(<ValidatedTick checked={false} onChange={mockOnChange} />);
    
    const button = screen.getByRole('checkbox');
    fireEvent.click(button);
    
    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange when toggled from checked to unchecked', () => {
    const mockOnChange = vi.fn();
    render(<ValidatedTick checked={true} onChange={mockOnChange} />);
    
    const button = screen.getByRole('checkbox');
    fireEvent.click(button);
    
    expect(mockOnChange).toHaveBeenCalledWith(false);
  });

  it('handles keyboard navigation with Space key', () => {
    const mockOnChange = vi.fn();
    render(<ValidatedTick checked={false} onChange={mockOnChange} />);
    
    const button = screen.getByRole('checkbox');
    fireEvent.keyDown(button, { key: ' ' });
    
    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  it('handles keyboard navigation with Enter key', () => {
    const mockOnChange = vi.fn();
    render(<ValidatedTick checked={false} onChange={mockOnChange} />);
    
    const button = screen.getByRole('checkbox');
    fireEvent.keyDown(button, { key: 'Enter' });
    
    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  it('does not call onChange when disabled', () => {
    const mockOnChange = vi.fn();
    render(<ValidatedTick checked={false} onChange={mockOnChange} disabled={true} />);
    
    const button = screen.getByRole('checkbox');
    fireEvent.click(button);
    
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<ValidatedTick checked={false} onChange={vi.fn()} size="sm" />);
    let button = screen.getByRole('checkbox');
    expect(button).toHaveClass('w-7', 'h-7');

    rerender(<ValidatedTick checked={false} onChange={vi.fn()} size="md" />);
    button = screen.getByRole('checkbox');
    expect(button).toHaveClass('w-8', 'h-8');

    rerender(<ValidatedTick checked={false} onChange={vi.fn()} size="lg" />);
    button = screen.getByRole('checkbox');
    expect(button).toHaveClass('w-10', 'h-10');
  });

  it('shows tooltip on hover', () => {
    render(<ValidatedTick checked={false} onChange={vi.fn()} showTooltip={true} />);
    
    const button = screen.getByRole('checkbox');
    fireEvent.mouseEnter(button);
    
    expect(screen.getByText('Marquer comme validé')).toBeInTheDocument();
  });

  it('shows different tooltip text when checked', () => {
    render(<ValidatedTick checked={true} onChange={vi.fn()} showTooltip={true} />);
    
    const button = screen.getByRole('checkbox');
    fireEvent.mouseEnter(button);
    
    expect(screen.getByText('Marqué comme validé')).toBeInTheDocument();
  });
});
