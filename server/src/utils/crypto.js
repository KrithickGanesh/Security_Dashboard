import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

const getMasterKey = () => {
  const secret = process.env.JWT_SECRET || 'devsecops_master_encryption_key_2026';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypt sensitive API key secret at rest using AES-256-GCM.
 */
export const encryptSecret = (plainText) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypt API key secret using AES-256-GCM.
 */
export const decryptSecret = (cipherText) => {
  const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Malformed encrypted secret format');
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getMasterKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

/**
 * Compute HMAC-SHA256 signature of raw body buffer.
 */
export const computeHmac = (rawBody, secret) => {
  const bodyBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody), 'utf8');
  return crypto.createHmac('sha256', secret).update(bodyBuffer).digest('hex');
};

/**
 * Cryptographically verify webhook HMAC signature using timing-safe comparison.
 */
export const verifyWebhookSignature = (rawBody, secret, headerSignature) => {
  if (!rawBody || !secret || !headerSignature) return false;

  // Header format: "sha256=<hex>" or raw "<hex>"
  const cleanSignature = headerSignature.startsWith('sha256=')
    ? headerSignature.slice(7)
    : headerSignature;

  const expectedHmac = computeHmac(rawBody, secret);

  const sigBuffer = Buffer.from(cleanSignature, 'hex');
  const expBuffer = Buffer.from(expectedHmac, 'hex');

  if (sigBuffer.length !== expBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expBuffer);
};

export default {
  encryptSecret,
  decryptSecret,
  computeHmac,
  verifyWebhookSignature
};
