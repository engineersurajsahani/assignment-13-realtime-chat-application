import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '../components/ui/Button.js';

describe('Button component', () => {
  it('renders children correctly', () => {
    render(<Button>Click Pulse</Button>);
    expect(screen.getByRole('button', { name: /click pulse/i })).toBeInTheDocument();
  });

  it('handles disabled state properly', () => {
    render(<Button disabled>Disabled Action</Button>);
    const btn = screen.getByRole('button', { name: /disabled action/i });
    expect(btn).toBeDisabled();
  });

  it('renders loading state and prevents clicks', () => {
    render(<Button isLoading>Loading State</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });
});
