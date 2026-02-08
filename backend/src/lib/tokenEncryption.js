/**
 * Token Encryption Utility
 * 
 * Encrypts and decrypts OAuth tokens using AES-256-CBC.
 * Tokens are stored encrypted in the database for security.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Get the encryption key from environment.
 * Key must be a 32-byte (64 hex character) string.
 */
function getEncryptionKey() {
  const key = process.env.TOKEN_ENCRYPTION_KEY || process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;

  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY (or GOOGLE_TOKEN_ENCRYPTION_KEY) environment variable is not set');
  }

  // Key should be 64 hex characters (32 bytes)
  if (key.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a token string.
 * Returns format: iv:encryptedData (both in hex)
 * 
 * @param {string} token - The plaintext token to encrypt
 * @returns {string} The encrypted token
 */
export function encryptToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a non-empty string');
  }
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return iv:encrypted format
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt an encrypted token.
 * Expects format: iv:encryptedData (both in hex)
 * 
 * @param {string} encryptedToken - The encrypted token
 * @returns {string} The decrypted plaintext token
 */
export function decryptToken(encryptedToken) {
  if (!encryptedToken || typeof encryptedToken !== 'string') {
    throw new Error('Encrypted token must be a non-empty string');
  }
  
  const parts = encryptedToken.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted token format');
  }
  
  const key = getEncryptionKey();
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length');
  }
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a new encryption key for use in environment variables.
 * This should only be run once during initial setup.
 * 
 * @returns {string} A 64-character hex string (32 bytes)
 */
export function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

export default {
  encryptToken,
  decryptToken,
  generateEncryptionKey,
};
