import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { TokenPayload, TokenService } from '@/application/ports/tokenService';
import { AuthError } from '@/shared/errors/appErrors';

const tokenPayloadSchema = z.object({
  account_id: z.string().min(1),
  role: z.string().min(1),
});

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly issuer: string,
  ) {}

  async signAccessToken(payload: TokenPayload, expiresInSeconds: number): Promise<string> {
    return jwt.sign(payload, this.secret, {
      algorithm: 'HS256',
      issuer: this.issuer,
      expiresIn: expiresInSeconds,
    });
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
        issuer: this.issuer,
      });

      if (typeof decoded !== 'object' || decoded === null) {
        throw new AuthError('Invalid or expired token');
      }

      const parsed = tokenPayloadSchema.safeParse(decoded);
      if (!parsed.success) {
        throw new AuthError('Invalid or expired token');
      }

      return parsed.data;
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError('Invalid or expired token');
    }
  }
}
