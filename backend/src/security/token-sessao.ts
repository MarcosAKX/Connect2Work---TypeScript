import { randomBytes, createHash } from 'node:crypto';
export class TokenSessao {
  gerar(): { token: string; hash: Buffer } {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: createHash('sha256').update(token).digest() };
  }
  hash(token: string): Buffer | null {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const bytes = Buffer.from(token, 'base64url');
    if (bytes.length !== 32 || bytes.toString('base64url') !== token) return null;
    return createHash('sha256').update(token).digest();
  }
}
