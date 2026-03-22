import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UpgradeConfirmationModal from '../UpgradeConfirmationModal';

// Mock BaseModal to simplify testing (avoids ModalManager/VideoModalContext dependencies)
vi.mock('@/components/ui/modal/BaseModal', () => ({
  default: ({ isOpen, onClose, children, title, modalId }) => {
    if (!isOpen) return null;
    return (
      <div role="dialog" aria-modal="true" data-testid={modalId}>
        <h2>{title}</h2>
        {children}
        <button onClick={onClose}>close</button>
      </div>
    );
  }
}));

describe('UpgradeConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    isLoading: false,
  };

  it('renders modal content when open', () => {
    render(<UpgradeConfirmationModal {...defaultProps} />);
    expect(screen.getByText('Passer à Pro')).toBeInTheDocument();
    expect(screen.getByText('€29')).toBeInTheDocument();
    expect(screen.getByText('/mois')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<UpgradeConfirmationModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Passer à Pro')).not.toBeInTheDocument();
  });

  it('displays plan benefits', () => {
    render(<UpgradeConfirmationModal {...defaultProps} />);
    expect(screen.getByText(/10 clients/i)).toBeInTheDocument();
    expect(screen.getByText(/6 mois/i)).toBeInTheDocument();
  });

  it('calls onConfirm when Continuer is clicked', () => {
    render(<UpgradeConfirmationModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Continuer'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Annuler is clicked', () => {
    render(<UpgradeConfirmationModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Annuler'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading state on CTA when isLoading is true', () => {
    render(<UpgradeConfirmationModal {...defaultProps} isLoading={true} />);
    const continuerBtn = screen.getByRole('button', { name: /chargement|continuer/i });
    expect(continuerBtn).toBeDisabled();
  });

  it('disables Continuer button when loading', () => {
    render(<UpgradeConfirmationModal {...defaultProps} isLoading={true} />);
    const buttons = screen.getAllByRole('button');
    const ctaButton = buttons.find(b => b.disabled);
    expect(ctaButton).toBeTruthy();
  });
});
