import { createHash } from 'node:crypto';
import { AuthError, NotFoundError } from '@/shared/errors/appErrors';
import type { PasswordHasher } from '@/application/ports/passwordHasher';
import type { UsersRepository } from '@/application/ports/usersRepository';
import type { PasswordResetTokensRepository } from '@/application/ports/passwordResetTokensRepository';

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export class ResetPassword {
  constructor(
    private readonly passwordResetTokensRepository: PasswordResetTokensRepository,
    private readonly usersRepository: UsersRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  public async execute(input: ResetPasswordInput): Promise<void> {
    const tokenHash = createHash('sha256').update(input.token).digest('hex');

    const record = await this.passwordResetTokensRepository.findByTokenHash(tokenHash);
    if (!record) {
      throw new AuthError('Invalid or expired reset token');
    }

    const now = new Date();
    if (record.usedAt) {
      throw new AuthError('Invalid or expired reset token');
    }

    if (record.expiresAt.getTime() <= now.getTime()) {
      throw new AuthError('Invalid or expired reset token');
    }

    const user = await this.usersRepository.findById(record.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const newPasswordHash = await this.passwordHasher.hash(input.password);
    user.changePasswordHash(newPasswordHash, now);

    await this.usersRepository.save(user);
    await this.passwordResetTokensRepository.markUsed(record.id, now);
  }
}
