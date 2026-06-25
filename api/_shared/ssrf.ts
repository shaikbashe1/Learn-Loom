// SSRF protection: validates URLs to prevent internal network access

const BLOCKED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  '169.254.169.254', // AWS/GCP metadata
];

const BLOCKED_PATTERNS = [
  /^10\./,           // RFC 1918
  /^172\.(1[6-9]|2[0-9]|3[01])\./,  // RFC 1918
  /^192\.168\./,     // RFC 1918
  /^fc00:/i,         // IPv6 private
  /^fe80:/i,         // IPv6 link-local
];

export function isUrlSafe(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow http and https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    // Block known internal hostnames
    if (BLOCKED_HOSTNAMES.includes(url.hostname)) {
      return false;
    }

    // Block private IP ranges
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(url.hostname)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}
