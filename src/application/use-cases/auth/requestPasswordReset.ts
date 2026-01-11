import { randomBytes, createHash } from 'node:crypto';
import { Email } from '@/domain/value-objects/email';
import type { UsersRepository } from '@/application/ports/usersRepository';
import type { PasswordResetTokensRepository } from '@/application/ports/passwordResetTokensRepository';
import type { Mailer } from '@/application/ports/mailer';

export type RequestPasswordResetInput = {
  email: string;
};

export class RequestPasswordReset {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordResetTokensRepository: PasswordResetTokensRepository,
    private readonly mailer: Mailer,
    private readonly tokenTtlMs: number = 1000 * 60 * 30,
  ) {}

  public async execute(input: RequestPasswordResetInput): Promise<void> {
    const email = Email.create(input.email);

    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      // Avoid user enumeration
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.tokenTtlMs);

    await this.passwordResetTokensRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const primitives = user.toPrimitives();

    await this.mailer.sendPasswordResetEmail({
      to: primitives.email,
      token: rawToken,
      expiresAt,
    });
  }
}
