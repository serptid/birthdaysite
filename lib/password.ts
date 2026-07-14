import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import type { ScryptOptions } from "crypto";

const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
} as const;

function scrypt(password: string, salt: string, keyLength: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);

  return [
    "scrypt",
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt,
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;

  const [algorithm, n, r, p, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !n || !r || !p || !salt || !hash) return false;

  const stored = Buffer.from(hash, "base64url");
  const derivedKey = await scrypt(password, salt, stored.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });

  return stored.length === derivedKey.length && timingSafeEqual(stored, derivedKey);
}
