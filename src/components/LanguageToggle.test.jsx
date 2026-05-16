import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import i18next from 'i18next';

// Mock the supabase client BEFORE importing the component
const updateUserMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: updateUserMock,
    },
  },
}));

import LanguageToggle from './LanguageToggle';

describe('<LanguageToggle />', () => {
  beforeEach(async () => {
    localStorage.clear();
    updateUserMock.mockReset();
    updateUserMock.mockResolvedValue({ data: { user: {} }, error: null });
    // Ensure each test starts on FR.
    await act(async () => {
      await i18next.changeLanguage('fr');
    });
  });

  it('renders FR and EN labels and marks the active one with aria-pressed=true', () => {
    render(<LanguageToggle />);
    const frButton = screen.getByRole('button', { name: 'FR' });
    const enButton = screen.getByRole('button', { name: 'EN' });
    expect(frButton).toBeInTheDocument();
    expect(enButton).toBeInTheDocument();
    expect(frButton).toHaveAttribute('aria-pressed', 'true');
    expect(enButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking EN switches i18next, writes localStorage, and calls updateUser exactly once', async () => {
    render(<LanguageToggle />);
    const enButton = screen.getByRole('button', { name: 'EN' });

    await act(async () => {
      fireEvent.click(enButton);
    });

    await waitFor(() => expect(i18next.language).toBe('en'));
    expect(localStorage.getItem('kaiyloLanguage')).toBe('en');
    expect(updateUserMock).toHaveBeenCalledTimes(1);
    expect(updateUserMock).toHaveBeenCalledWith({ data: { language: 'en' } });
  });

  it('does not throw or crash when updateUser rejects; i18next + localStorage still update', async () => {
    updateUserMock.mockRejectedValueOnce(new Error('network down'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<LanguageToggle />);
    const enButton = screen.getByRole('button', { name: 'EN' });

    await act(async () => {
      fireEvent.click(enButton);
    });

    await waitFor(() => expect(i18next.language).toBe('en'));
    expect(localStorage.getItem('kaiyloLanguage')).toBe('en');
    // Allow the rejected promise to settle so console.warn fires.
    await new Promise((r) => setTimeout(r, 0));
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('clicking the currently active button is a no-op (no updateUser, no changeLanguage)', async () => {
    const changeLanguageSpy = vi.spyOn(i18next, 'changeLanguage');
    render(<LanguageToggle />);
    const frButton = screen.getByRole('button', { name: 'FR' });

    await act(async () => {
      fireEvent.click(frButton);
    });

    expect(updateUserMock).not.toHaveBeenCalled();
    expect(changeLanguageSpy).not.toHaveBeenCalled();
    changeLanguageSpy.mockRestore();
  });

  it('after click, <html lang> reflects the new language (AC-8 regression)', async () => {
    document.documentElement.lang = 'fr';
    render(<LanguageToggle />);
    const enButton = screen.getByRole('button', { name: 'EN' });

    await act(async () => {
      fireEvent.click(enButton);
    });

    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
  });
});
