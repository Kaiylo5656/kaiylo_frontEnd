import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, badgeVariants } from '../badge';

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>Free</Badge>);
    const badge = screen.getByText('Free');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-primary');
  });

  it('renders with success variant', () => {
    render(<Badge variant="success">Actif</Badge>);
    const badge = screen.getByText('Actif');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-green-500/20');
    expect(badge.className).toContain('text-green-400');
  });

  it('renders with warning variant', () => {
    render(<Badge variant="warning">Attention</Badge>);
    const badge = screen.getByText('Attention');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-amber-500/20');
    expect(badge.className).toContain('text-amber-400');
  });

  it('renders with outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = screen.getByText('Outline');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-foreground');
  });

  it('accepts custom className', () => {
    render(<Badge className="custom-class">Test</Badge>);
    const badge = screen.getByText('Test');
    expect(badge.className).toContain('custom-class');
  });

  it('exports badgeVariants function', () => {
    expect(typeof badgeVariants).toBe('function');
    const classes = badgeVariants({ variant: 'success' });
    expect(classes).toContain('bg-green-500/20');
  });

  it('pairs color with text label (UX-DR11)', () => {
    render(<Badge variant="success">Actif</Badge>);
    const badge = screen.getByText('Actif');
    expect(badge.textContent).toBeTruthy();
  });
});
