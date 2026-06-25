/**
 * Lightweight HTML sanitizer that strips dangerous tags and attributes
 * to prevent XSS attacks when rendering user-generated HTML content.
 * 
 * For production use with untrusted content, consider replacing with DOMPurify.
 */

const DANGEROUS_TAGS = [
  'script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea',
  'select', 'button', 'link', 'meta', 'style', 'base', 'applet',
];

const DANGEROUS_ATTRS = [
  'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
  'onsubmit', 'onreset', 'onchange', 'oninput', 'onkeydown', 'onkeyup',
  'onkeypress', 'onmousedown', 'onmouseup', 'onmousemove', 'onmouseout',
  'ondblclick', 'ondrag', 'ondragend', 'ondragenter', 'ondragleave',
  'ondragover', 'ondragstart', 'ondrop', 'oncontextmenu', 'onwheel',
  'onanimationstart', 'onanimationend', 'ontransitionend',
  'formaction', 'xlink:href', 'data-bind',
];

export function sanitizeHtml(html: string): string {
  if (!html) return '';

  let sanitized = html;

  // Remove dangerous tags and their contents
  for (const tag of DANGEROUS_TAGS) {
    const openClose = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, 'gi');
    sanitized = sanitized.replace(openClose, '');
    // Also remove self-closing variants
    const selfClose = new RegExp(`<${tag}[^>]*/?>`, 'gi');
    sanitized = sanitized.replace(selfClose, '');
  }

  // Remove dangerous attributes (event handlers)
  for (const attr of DANGEROUS_ATTRS) {
    const attrPattern = new RegExp(`\\s${attr}\\s*=\\s*(["'][^"']*["']|\\S+)`, 'gi');
    sanitized = sanitized.replace(attrPattern, '');
  }

  // Remove javascript: protocol from href and src attributes
  sanitized = sanitized.replace(/\b(href|src|action)\s*=\s*["']\s*javascript:/gi, '$1="');

  // Remove data: protocol from src (except images)
  sanitized = sanitized.replace(/\bsrc\s*=\s*["']\s*data:(?!image\/)/gi, 'src="');

  return sanitized;
}
