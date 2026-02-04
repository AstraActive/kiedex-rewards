/**
 * Validation utilities for social task proof submissions
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate Telegram username
 * - Must start with @
 * - 5-32 characters after @
 * - Only letters, numbers, underscore allowed
 */
export function validateTelegramUsername(value: string): ValidationResult {
  const trimmed = value.trim();

  if (!trimmed.startsWith('@')) {
    return { valid: false, error: 'Must start with @' };
  }

  const username = trimmed.slice(1);

  if (username.length < 5) {
    return { valid: false, error: 'Username must be at least 5 characters' };
  }

  if (username.length > 32) {
    return { valid: false, error: 'Username must be at most 32 characters' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Only letters, numbers, and underscore allowed' };
  }

  return { valid: true };
}

/**
 * Validate Twitter/X username
 * - Must start with @
 * - 1-15 characters after @
 * - Only letters, numbers, underscore allowed
 */
export function validateTwitterUsername(value: string): ValidationResult {
  const trimmed = value.trim();

  if (!trimmed.startsWith('@')) {
    return { valid: false, error: 'Must start with @' };
  }

  const username = trimmed.slice(1);

  if (username.length < 1) {
    return { valid: false, error: 'Username cannot be empty' };
  }

  if (username.length > 15) {
    return { valid: false, error: 'Username must be at most 15 characters' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Only letters, numbers, and underscore allowed' };
  }

  return { valid: true };
}

/**
 * Validate Tweet/Repost link
 * - Must be valid URL
 * - Must be from twitter.com or x.com
 * - Must contain /status/ (direct tweet link)
 */
export function validateTweetLink(value: string): ValidationResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return { valid: false, error: 'Link cannot be empty' };
  }

  try {
    const url = new URL(trimmed);

    const isValidDomain =
      url.hostname === 'x.com' ||
      url.hostname === 'twitter.com' ||
      url.hostname === 'www.x.com' ||
      url.hostname === 'www.twitter.com' ||
      url.hostname === 'mobile.twitter.com' ||
      url.hostname === 'mobile.x.com';

    if (!isValidDomain) {
      return { valid: false, error: 'Must be a twitter.com or x.com link' };
    }

    if (!url.pathname.includes('/status/')) {
      return { valid: false, error: 'Must be a direct tweet link (include /status/)' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate generic web link
 * - Must be valid URL
 * - Must start with http:// or https://
 */
export function validateWebLink(value: string): ValidationResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return { valid: false, error: 'Link cannot be empty' };
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, error: 'Must be an http or https link' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate proof based on type
 */
export function validateProof(proofType: string, value: string): ValidationResult {
  switch (proofType) {
    case 'telegram_username':
      return validateTelegramUsername(value);
    case 'twitter_username':
      return validateTwitterUsername(value);
    case 'tweet_link':
      return validateTweetLink(value);
    case 'web_link':
      return validateWebLink(value);
    default:
      return { valid: false, error: 'Unknown proof type' };
  }
}

/**
 * Get placeholder text for proof input
 */
export function getProofPlaceholder(proofType: string): string {
  switch (proofType) {
    case 'telegram_username':
      return '@your_telegram_username';
    case 'twitter_username':
      return '@your_twitter_handle';
    case 'tweet_link':
      return 'https://x.com/you/status/...';
    case 'web_link':
      return 'https://example.com/...';
    default:
      return 'Enter proof...';
  }
}

/**
 * Get help text for proof input
 */
export function getProofHelpText(proofType: string): string {
  switch (proofType) {
    case 'telegram_username':
      return 'Enter your Telegram username (starts with @)';
    case 'twitter_username':
      return 'Enter your Twitter/X username (starts with @)';
    case 'tweet_link':
      return 'Paste the link to your retweet/repost';
    case 'web_link':
      return 'Paste the URL link as proof';
    default:
      return 'Enter your proof';
  }
}
