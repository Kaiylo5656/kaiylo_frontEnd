import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FacturationPage from '../FacturationPage';

// Mock AuthContext
const mockGetAuthToken = vi.fn().mockResolvedValue('test-token');
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    getAuthToken: mockGetAuthToken,
  }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => {
      const { initial, animate, transition, whileHover, whileTap, ...validProps } = props;
      return <div {...validProps}>{children}</div>;
    },
    h1: ({ children, ...props }) => {
      const { initial, animate, transition, ...validProps } = props;
      return <h1 {...validProps}>{children}</h1>;
    },
  },
  AnimatePresence: ({ children }) => children,
}));

// Mock api config
vi.mock('@/config/api', () => ({
  buildApiUrl: (path) => `http://localhost:3001${path}`,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <FacturationPage />
    </MemoryRouter>
  );

describe('FacturationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('shows skeleton loading states while fetching', () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // never resolves
    renderPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders 4-card layout for Free coach', async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: { plan: 'free', status: 'active', clientCount: 1, clientLimit: 3, currentPeriodEnd: null },
      }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Mon Abonnement')).toBeInTheDocument();
    });

    expect(screen.getByText('Détails de Facturation')).toBeInTheDocument();
    expect(screen.getByText('Historique')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  it('displays Free plan with default badge and upgrade CTA', async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: { plan: 'free', status: 'active', clientCount: 2, clientLimit: 3, currentPeriodEnd: null },
      }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    expect(screen.getByText('Gratuit')).toBeInTheDocument();
    expect(screen.getByText('Clients actifs')).toBeInTheDocument();
    expect(screen.getByText('Passer à Pro')).toBeInTheDocument();
  });

  it('Free upgrade CTA is not disabled (Story 1.5 will wire checkout)', async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: { plan: 'free', status: 'active', clientCount: 1, clientLimit: 3, currentPeriodEnd: null },
      }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Passer à Pro')).toBeInTheDocument();
    });

    const ctaButton = screen.getByText('Passer à Pro').closest('button');
    expect(ctaButton).not.toBeDisabled();
  });

  it('displays Pro plan with success badge and manage CTA', async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: { plan: 'pro', status: 'active', clientCount: 5, clientLimit: 10, currentPeriodEnd: '2026-04-21T00:00:00Z' },
      }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    // Success badge with "Actif" text
    const badges = screen.getAllByText('Actif');
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0].className).toContain('bg-green-500/20');

    expect(screen.getByText('Gérer mon abonnement')).toBeInTheDocument();
  });

  it('shows error state with retry button on API failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Impossible de charger les informations de facturation')).toBeInTheDocument();
    });

    expect(screen.getByText('Réessayer')).toBeInTheDocument();
  });

  it('displays correct date format for Pro billing period', async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: { plan: 'pro', status: 'active', clientCount: 3, clientLimit: 10, currentPeriodEnd: '2026-04-21T00:00:00Z' },
      }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Période en cours')).toBeInTheDocument();
    });

    expect(screen.getByText('21 avril 2026')).toBeInTheDocument();
  });

  it('shows "Aucun historique" for Free coach', async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: { plan: 'free', status: 'active', clientCount: 0, clientLimit: 3, currentPeriodEnd: null },
      }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Aucun historique')).toBeInTheDocument();
    });
  });

  it('shows history link for Pro coach', async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: { plan: 'pro', status: 'active', clientCount: 5, clientLimit: 10, currentPeriodEnd: '2026-04-21T00:00:00Z' },
      }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Voir l'historique")).toBeInTheDocument();
    });
  });
});
