export type PasswordResetTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

export interface PasswordResetTokensRepository {
  create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<{ id: string }>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  markUsed(id: string, usedAt: Date): Promise<void>;
}
