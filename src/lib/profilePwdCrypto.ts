const PBKDF2_ITERATIONS = 150_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

function bytesToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0) return null;
  const pairs = hex.match(/../g);
  if (!pairs || pairs.length * 2 !== hex.length) return null;
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)));
}

async function pbkdf2Sha256(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    HASH_BITS
  );
}

export async function hashProfilePassword(plain: string): Promise<{ hashHex: string; saltHex: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2Sha256(plain, salt);
  return { hashHex: bytesToHex(hash), saltHex: bytesToHex(salt) };
}

export async function verifyProfilePassword(plain: string, hashHex: string, saltHex: string): Promise<boolean> {
  const salt = hexToBytes(saltHex);
  const expected = hexToBytes(hashHex);
  if (!salt || !expected) return false;
  try {
    const actualBuf = await pbkdf2Sha256(plain, salt);
    const actual = new Uint8Array(actualBuf);
    if (expected.length !== actual.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected[i]! ^ actual[i]!;
    return diff === 0;
  } catch {
    return false;
  }
}
