import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider, useTheme } from '../app/ThemeContext.js';

function TestConsumer() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe('Theme Context & Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('initializes with stored or system preference and applies data-theme', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    const themeDisplay = screen.getByTestId('theme');
    expect(themeDisplay.textContent).toBe('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('updates data-theme attribute on DOM and persists to localStorage', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    const darkBtn = screen.getByText('Set Dark');
    act(() => {
      darkBtn.click();
    });

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('pulsechat_theme')).toBe('dark');
  });
});
