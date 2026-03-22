export type PasswordResetTokenRecord = {
  id: string;
  accountId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

export interface PasswordResetTokensRepository {
  create(input: { accountId: string; tokenHash: string; expiresAt: Date }): Promise<{ id: string }>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  markUsed(id: string, usedAt: Date): Promise<void>;
}
