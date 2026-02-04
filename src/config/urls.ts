// Production base URL for all auth redirects and external links
export const PRODUCTION_URL = 'https://kiedex.app';

// Get the appropriate base URL based on environment
export function getBaseUrl(): string {
  // Always use production URL for OAuth redirects
  // This ensures users stay on the custom domain after login
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Use current origin for localhost/development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return window.location.origin;
    }
    // Use current origin for preview URLs
    if (hostname.includes('kiedex.app') || hostname.includes('kiedex.app')) {
      return window.location.origin;
    }
  }
  return PRODUCTION_URL;
}
