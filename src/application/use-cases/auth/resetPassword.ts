import { createHash } from 'node:crypto';
import { AuthError, NotFoundError } from '@/shared/errors/appErrors';
import type { PasswordHasher } from '@/application/ports/passwordHasher';
import type { AccountsRepository } from '@/application/ports/accountsRepository';
import type { PasswordResetTokensRepository } from '@/application/ports/passwordResetTokensRepository';

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export class ResetPassword {
  constructor(
    private readonly passwordResetTokensRepository: PasswordResetTokensRepository,
    private readonly accountsRepository: AccountsRepository,
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

    const account = await this.accountsRepository.findById(record.accountId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    const newPasswordHash = await this.passwordHasher.hash(input.password);
    account.changePasswordHash(newPasswordHash, now);

    await this.accountsRepository.save(account);
    await this.passwordResetTokensRepository.markUsed(record.id, now);
  }
}
