/**
 * Structured Logger for Nexus Corporate Billing System
 * Sanitizes sensitive fields (passwords, JWT tokens, Stripe secrets, SMTP credentials)
 */

const SENSITIVE_KEYS = [
  'password',
  'token',
  'jwt',
  'secret',
  'authorization',
  'stripe_secret_key',
  'stripe_webhook_secret',
  'smtp_password'
];

function sanitize(data) {
  if (!data || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatMessage(level, event, metadata = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = sanitize(metadata);
  const metaStr = Object.keys(sanitizedMeta).length ? ` | ${JSON.stringify(sanitizedMeta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [${event}]${metaStr}`;
}

export const logger = {
  info: (event, metadata) => {
    console.log('\x1b[36m%s\x1b[0m', formatMessage('info', event, metadata));
  },
  warn: (event, metadata) => {
    console.warn('\x1b[33m%s\x1b[0m', formatMessage('warn', event, metadata));
  },
  error: (event, metadata) => {
    console.error('\x1b[31m%s\x1b[0m', formatMessage('error', event, metadata));
  },
  security: (event, metadata) => {
    // Special high-priority security log for auth/IDOR/tampering attempts
    console.error('\x1b[41m\x1b[37m%s\x1b[0m', formatMessage('security-alert', event, metadata));
  }
};
