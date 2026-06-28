export const BIO_LIMIT = 300;

/**
 * Mobile number validation. The field is optional, so an empty value is valid;
 * but if the user types something it must look like a real phone number
 * (optional leading +, 8–15 digits, spaces/hyphens ignored).
 * OTP verification can be layered on later without changing this.
 */
export function isValidMobile(raw: string): boolean {
  const v = raw.trim();
  if (!v) return true;
  return /^\+?\d{8,15}$/.test(v.replace(/[\s-]/g, ''));
}

export function isPincodeValid(raw: string): boolean {
  const v = raw.trim();
  if (!v) return true;
  return /^\d{4,10}$/.test(v);
}
