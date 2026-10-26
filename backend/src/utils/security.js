import crypto from 'node:crypto';
import config from '../config/index.js';

/**
 * Hash owner password using salted scrypt with high work factor
 */
export function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

/**
 * Constant-time verification of password against stored salted hash
 */
export function verifyPassword(password, storedHash) {
  if (!password || !storedHash || !storedHash.startsWith('scrypt:')) {
    return false;
  }

  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;

  const [, salt, originalHex] = parts;
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');

  const bufA = Buffer.from(originalHex, 'hex');
  const bufB = Buffer.from(derivedKey, 'hex');

  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate a high-entropy 128-bit owner recovery credential
 * Formatted cleanly as: L2G-XXXX-XXXX-XXXX-XXXX
 */
export function generateRecoveryKey() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let key = 'L2G';
  for (let group = 0; group < 4; group++) {
    key += '-';
    for (let i = 0; i < 4; i++) {
      const idx = crypto.randomInt(0, chars.length);
      key += chars[idx];
    }
  }
  return key;
}

/**
 * Hash recovery key for secure storage
 */
export function hashRecoveryKey(recoveryKey) {
  const normalized = recoveryKey.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return crypto
    .createHash('sha256')
    .update(normalized + config.sessionSecret)
    .digest('hex');
}

/**
 * Verify recovery key
 */
export function verifyRecoveryKey(recoveryKey, storedHash) {
  if (!recoveryKey || !storedHash) return false;
  const computed = hashRecoveryKey(recoveryKey);
  const bufA = Buffer.from(computed, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export default {
  hashPassword,
  verifyPassword,
  generateRecoveryKey,
  hashRecoveryKey,
  verifyRecoveryKey
};
