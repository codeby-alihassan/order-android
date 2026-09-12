/**
 * Web Crypto PBKDF2 authentication service for Orderly POS
 * Client-side secure password hashing and verification.
 */

export async function generateSalt(length: number = 16): Promise<string> {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Convert hex salt back to bytes
  const saltBytes = new Uint8Array(
    (saltHex.match(/.{1,2}/g) || []).map((byte) => parseInt(byte, 16))
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedKey));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(
  passwordAttempt: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  try {
    const attemptHash = await hashPassword(passwordAttempt, storedSalt);
    return attemptHash === storedHash;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

export async function hashNewPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = await generateSalt(16);
  const hash = await hashPassword(password, salt);
  return { hash, salt };
}
