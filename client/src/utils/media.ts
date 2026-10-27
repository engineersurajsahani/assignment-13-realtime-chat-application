/**
 * Utility functions for resolving media and upload URLs across local development
 * and production deployments (e.g. Vercel frontend + Render backend).
 */

const FALLBACK_RENDER_BACKEND = 'https://chatterly-ql6l.onrender.com';

/**
 * Returns the backend base origin without trailing slash (e.g. "https://chatterly-ql6l.onrender.com").
 * Returns an empty string in local development so relative paths proxy via Vite server.
 */
export function getBackendOrigin(): string {
  const envApi = import.meta.env.VITE_API_URL;
  if (envApi && /^https?:\/\//i.test(envApi)) {
    return envApi.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  }

  // If running on Vercel or any external domain without VITE_API_URL set, default to Render backend
  if (typeof window !== 'undefined' && (window.location.hostname.includes('vercel.app') || !window.location.hostname.includes('localhost'))) {
    return FALLBACK_RENDER_BACKEND;
  }

  return '';
}

/**
 * Resolves a media or file upload URL to an absolute URL pointing to the backend
 * if needed, or preserves data/blob/external URLs.
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Already an absolute URL, data URL, or blob URL
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const backend = getBackendOrigin();
  const cleanPath = trimmed.replace(/^\/+/, '');

  if (backend) {
    return `${backend}/${cleanPath}`;
  }

  return `/${cleanPath}`;
}

/**
 * Checks if an avatar string represents an uploaded image or external URL
 * rather than a single-character avatar initial (e.g. 'A', 'M', 'J').
 */
export function isAvatarImage(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Single initials or short badge codes like 'A', 'M', 'J'
  if (trimmed.length <= 3 && !trimmed.includes('.') && !trimmed.includes('/')) {
    return false;
  }

  if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
    return true;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return true;
  }

  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    return true;
  }

  if (/\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$/i.test(trimmed)) {
    return true;
  }

  return false;
}
