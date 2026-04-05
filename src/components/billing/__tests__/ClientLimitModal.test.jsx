import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClientLimitModal from '../ClientLimitModal';

// Mock BaseModal to simplify testing (avoids ModalManager/VideoModalContext dependencies)
vi.mock('@/components/ui/modal/BaseModal', () => ({
  default: ({ isOpen, onClose, children, title, modalId }) => {
    if (!isOpen) return null;
    return (
      <div role="dialog" aria-modal="true" data-testid={modalId}>
        <h2>{title}</h2>
        {children}
        <button onClick={onClose} data-testid="modal-close">close</button>
      </div>
    );
  }
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    getAuthToken: vi.fn().mockResolvedValue('mock-token'),
  }),
}));

// Mock api config
vi.mock('@/config/api', () => ({
  buildApiUrl: (path) => `http://localhost:3001${path}`,
}));

describe('ClientLimitModal', () => {
  const defaultFreeProps = {
    isOpen: true,
    onClose: vi.fn(),
    plan: 'free',
    limit: 3,
    count: 3,
  };

  const defaultProProps = {
    isOpen: true,
    onClose: vi.fn(),
    plan: 'pro',
    limit: 10,
    count: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Free plan', () => {
    it('renders growth-milestone messaging for free plan', () => {
      render(<ClientLimitModal {...defaultFreeProps} />);
      expect(screen.getByText(/Bravo, vous accompagnez déjà 3 clients/)).toBeInTheDocument();
    });

    it('shows encouraging body copy without error framing', () => {
      render(<ClientLimitModal {...defaultFreeProps} />);
      expect(screen.getByText(/super début/)).toBeInTheDocument();
      expect(screen.getByText(/Passez à Pro/)).toBeInTheDocument();
    });

    it('shows upgrade CTA button', () => {
      render(<ClientLimitModal {...defaultFreeProps} />);
      expect(screen.getByText('Passer à Pro')).toBeInTheDocument();
    });

    it('displays price information', () => {
      render(<ClientLimitModal {...defaultFreeProps} />);
      expect(screen.getByText('€29')).toBeInTheDocument();
      expect(screen.getByText('/mois')).toBeInTheDocument();
    });

    it('shows "Plus tard" dismiss button', () => {
      render(<ClientLimitModal {...defaultFreeProps} />);
      expect(screen.getByText('Plus tard')).toBeInTheDocument();
    });

    it('calls onClose when "Plus tard" is clicked', () => {
      const onClose = vi.fn();
      render(<ClientLimitModal {...defaultFreeProps} onClose={onClose} />);
      fireEvent.click(screen.getByText('Plus tard'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('handles missing count gracefully with fallback', () => {
      render(<ClientLimitModal {...defaultFreeProps} count={undefined} />);
      expect(screen.getByText(/Bravo, vous accompagnez déjà 3 clients/)).toBeInTheDocument();
    });
  });

  describe('Pro plan', () => {
    it('renders milestone messaging for pro plan', () => {
      render(<ClientLimitModal {...defaultProProps} />);
      expect(screen.getByText(/10 clients, impressionnant/)).toBeInTheDocument();
      expect(screen.getByText(/capacité maximale du plan Pro/)).toBeInTheDocument();
    });

    it('shows "palier supérieur" coming soon message', () => {
      render(<ClientLimitModal {...defaultProProps} />);
      expect(screen.getByText(/palier supérieur arrive bientôt/)).toBeInTheDocument();
    });

    it('does NOT show upgrade CTA button', () => {
      render(<ClientLimitModal {...defaultProProps} />);
      expect(screen.queryByText('Passer à Pro')).not.toBeInTheDocument();
    });

    it('does NOT show price information', () => {
      render(<ClientLimitModal {...defaultProProps} />);
      expect(screen.queryByText('€29')).not.toBeInTheDocument();
    });

    it('shows "Compris" dismiss button', () => {
      render(<ClientLimitModal {...defaultProProps} />);
      expect(screen.getByText('Compris')).toBeInTheDocument();
    });

    it('calls onClose when "Compris" is clicked', () => {
      const onClose = vi.fn();
      render(<ClientLimitModal {...defaultProProps} onClose={onClose} />);
      fireEvent.click(screen.getByText('Compris'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('handles missing count gracefully with fallback', () => {
      render(<ClientLimitModal {...defaultProProps} count={undefined} />);
      expect(screen.getByText(/10 clients, impressionnant/)).toBeInTheDocument();
    });
  });

  describe('Modal behavior', () => {
    it('does not render when isOpen is false', () => {
      render(<ClientLimitModal {...defaultFreeProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders with dialog role and aria-modal when open', () => {
      render(<ClientLimitModal {...defaultFreeProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has correct modal ID', () => {
      render(<ClientLimitModal {...defaultFreeProps} />);
      expect(screen.getByTestId('client-limit')).toBeInTheDocument();
    });

    it('is dismissible via BaseModal close', () => {
      const onClose = vi.fn();
      render(<ClientLimitModal {...defaultFreeProps} onClose={onClose} />);
      fireEvent.click(screen.getByTestId('modal-close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('decorative icon has aria-hidden', () => {
      render(<ClientLimitModal {...defaultFreeProps} />);
      const icon = document.querySelector('[aria-hidden="true"]');
      expect(icon).toBeTruthy();
    });
  });

  describe('Checkout error handling', () => {
    it('shows error message when fetch fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<ClientLimitModal {...defaultFreeProps} />);
      fireEvent.click(screen.getByText('Passer à Pro'));
      // Wait for async handler
      await vi.waitFor(() => {
        expect(screen.getByText(/Erreur lors de la redirection/)).toBeInTheDocument();
      });
    });

    it('shows error when response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      render(<ClientLimitModal {...defaultFreeProps} />);
      fireEvent.click(screen.getByText('Passer à Pro'));
      await vi.waitFor(() => {
        expect(screen.getByText(/Impossible de créer la session/)).toBeInTheDocument();
      });
    });

    it('shows error when result has no checkoutUrl', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Something went wrong' }),
      });
      render(<ClientLimitModal {...defaultFreeProps} />);
      fireEvent.click(screen.getByText('Passer à Pro'));
      await vi.waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });
    });
  });
});
