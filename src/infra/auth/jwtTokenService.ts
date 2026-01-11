import jwt from 'jsonwebtoken';
import type { TokenPayload, TokenService } from '@/application/ports/tokenService';

export class JwtTokenService implements TokenService {
  constructor(private readonly secret: string) {}

  async signAccessToken(payload: TokenPayload, expiresInSeconds: number): Promise<string> {
    return jwt.sign(payload, this.secret, { expiresIn: expiresInSeconds });
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    const decoded = jwt.verify(token, this.secret);

    if (typeof decoded !== 'object' || decoded === null) {
      throw new Error('Invalid token payload');
    }

    const sub = (decoded as any).sub;
    const role = (decoded as any).role;

    if (typeof sub !== 'string' || typeof role !== 'string') {
      throw new Error('Invalid token payload');
    }

    return { sub, role };
  }
}
