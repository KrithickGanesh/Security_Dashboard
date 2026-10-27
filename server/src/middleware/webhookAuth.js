import ApiKey from '../models/ApiKey.js';
import { decryptSecret, verifyWebhookSignature } from '../utils/crypto.js';
import logger from '../utils/logger.js';

/**
 * Middleware to authenticate CI/CD webhook requests using API Key & HMAC-SHA256 signature.
 */
export const verifyWebhook = async (req, res, next) => {
  try {
    const keyId = req.headers['x-api-key'];
    const signature = req.headers['x-signature'];

    if (!keyId || !signature) {
      return res.status(401).json({
        success: false,
        message: 'Webhook authentication requires X-API-Key and X-Signature headers.',
        data: null
      });
    }

    const apiKey = await ApiKey.findOne({ keyId, revoked: false }).select(
      '+encryptedSecret +hashedSecret'
    );

    if (!apiKey) {
      logger.warn(`Webhook rejected: API key not found or revoked: ${keyId}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid or revoked API Key.',
        data: null
      });
    }

    let secret;
    try {
      secret = decryptSecret(apiKey.encryptedSecret);
    } catch (decryptErr) {
      logger.error(`Failed to decrypt secret for API key ${keyId}: ${decryptErr.message}`);
      return res.status(500).json({
        success: false,
        message: 'Internal cryptographic decryption error',
        data: null
      });
    }

    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const isValid = verifyWebhookSignature(rawBody, secret, signature);

    if (!isValid) {
      logger.warn(`Webhook HMAC signature mismatch for API key ${keyId}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid HMAC signature. Payload integrity verification failed.',
        data: null
      });
    }

    // Update last used timestamp asynchronously
    ApiKey.findByIdAndUpdate(apiKey._id, { lastUsedAt: new Date() }).exec();

    req.apiKey = apiKey;
    next();
  } catch (error) {
    logger.error(`Webhook auth error: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Authentication error: ' + error.message,
      data: null
    });
  }
};

export default verifyWebhook;
