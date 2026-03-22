import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Toast } from '../Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with message when visible', () => {
    render(<Toast message="Bienvenue sur Pro !" isVisible={true} onClose={() => {}} />);
    expect(screen.getByText('Bienvenue sur Pro !')).toBeInTheDocument();
  });

  it('does not render content when not visible', () => {
    render(<Toast message="Bienvenue sur Pro !" isVisible={false} onClose={() => {}} />);
    expect(screen.queryByText('Bienvenue sur Pro !')).not.toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<Toast message="Bienvenue sur Pro !" isVisible={true} onClose={() => {}} />);
    const toast = screen.getByRole('status');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('auto-dismisses after default duration (5000ms)', () => {
    const onClose = vi.fn();
    render(<Toast message="Test" isVisible={true} onClose={onClose} />);

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after custom duration', () => {
    const onClose = vi.fn();
    render(<Toast message="Test" isVisible={true} onClose={onClose} duration={3000} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders with success type styling by default', () => {
    render(<Toast message="Success" isVisible={true} onClose={() => {}} />);
    const toast = screen.getByRole('status');
    expect(toast.className).toMatch(/emerald/);
  });

  it('renders CheckCircle icon', () => {
    render(<Toast message="Test" isVisible={true} onClose={() => {}} type="success" />);
    // Lucide icons render as SVG
    const toast = screen.getByRole('status');
    const svg = toast.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
