import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from '../components/ui/Avatar.js';

describe('Shared Avatar Component', () => {
  it('renders initial dynamically from display name when no picture exists', () => {
    render(<Avatar name="Jui Tawde" size="md" />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders initial correctly for Rahul Sharma', () => {
    render(<Avatar name="Rahul Sharma" size="md" />);
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('renders initial without loading broken image when avatar is a single-letter badge', () => {
    render(<Avatar name="Aarav Sharma" src="A" size="md" />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('handles missing, null, or undefined avatar values cleanly', () => {
    render(<Avatar name="Neha Gupta" src={null} avatarUrl={undefined} size="md" />);
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders image when src is valid and does not show initial simultaneously', () => {
    render(<Avatar name="Jui Tawde" src="https://example.com/avatar.jpg" size="md" />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(screen.queryByText('J')).toBeNull();
  });

  it('renders image for relative /uploads/... paths resolved by resolveMediaUrl', () => {
    render(<Avatar name="Jui Tawde" src="/uploads/avatar-123.jpg" size="md" />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('avatar-123.jpg');
    expect(screen.queryByText('J')).toBeNull();
  });

  it('falls back to initial gracefully when image fails to load (onError)', () => {
    render(<Avatar name="Jui Tawde" src="https://example.com/broken.jpg" size="md" />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders online presence indicator when isOnline is true', () => {
    const { container } = render(<Avatar name="Alex" isOnline={true} size="md" />);
    const dot = container.querySelector('span[title="Online"]');
    expect(dot).toBeInTheDocument();
  });
});
