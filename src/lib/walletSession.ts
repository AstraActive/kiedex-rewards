/**
 * Wallet session management
 * Tracks when user last verified their wallet connection
 * Session expires after period of inactivity
 */

const SESSION_KEY = 'wallet_session';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

interface WalletSession {
  address: string;
  lastVerified: number;
  lastActivity: number;
}

/**
 * Get current wallet session
 */
export function getWalletSession(address: string | undefined): WalletSession | null {
  if (!address) return null;

  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const session: WalletSession = JSON.parse(stored);
    
    // Check if session is for the same address
    if (session.address.toLowerCase() !== address.toLowerCase()) {
      return null;
    }

    // Check if session has expired
    const now = Date.now();
    const timeSinceActivity = now - session.lastActivity;
    
    if (timeSinceActivity > SESSION_TIMEOUT) {
      // Session expired
      clearWalletSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error reading wallet session:', error);
    return null;
  }
}

/**
 * Check if wallet session is valid
 */
export function isWalletSessionValid(address: string | undefined): boolean {
  const session = getWalletSession(address);
  return session !== null;
}

/**
 * Update wallet session activity
 * Call this on any user interaction to keep session alive
 */
export function updateWalletActivity(address: string | undefined): void {
  if (!address) return;

  try {
    const session = getWalletSession(address);
    if (session) {
      // Update existing session
      session.lastActivity = Date.now();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch (error) {
    console.error('Error updating wallet activity:', error);
  }
}

/**
 * Mark wallet as verified for this session
 */
export function setWalletVerified(address: string): void {
  try {
    const now = Date.now();
    const session: WalletSession = {
      address: address.toLowerCase(),
      lastVerified: now,
      lastActivity: now,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Error setting wallet verified:', error);
  }
}

/**
 * Clear wallet session
 */
export function clearWalletSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Error clearing wallet session:', error);
  }
}

/**
 * Get time until session expires (in milliseconds)
 */
export function getTimeUntilExpiry(address: string | undefined): number {
  const session = getWalletSession(address);
  if (!session) return 0;

  const now = Date.now();
  const timeSinceActivity = now - session.lastActivity;
  const timeRemaining = SESSION_TIMEOUT - timeSinceActivity;
  
  return Math.max(0, timeRemaining);
}
