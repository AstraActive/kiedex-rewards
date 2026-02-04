// Allowed Gmail domains for anti-spam protection
const ALLOWED_DOMAINS = ['gmail.com', 'googlemail.com'];

/**
 * Check if an email address is from an allowed domain (Gmail only)
 */
export function isAllowedEmailDomain(email: string | undefined | null): boolean {
  if (!email) return false;
  const domain = email.toLowerCase().split('@')[1];
  return ALLOWED_DOMAINS.includes(domain);
}

export const EMAIL_DOMAIN_ERROR_MESSAGE = 
  "Only Gmail accounts are supported. Please sign in using a @gmail.com account.";
