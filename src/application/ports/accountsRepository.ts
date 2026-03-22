import type { Account } from '@/domain/entities/account';
import type { Email } from '@/domain/value-objects/email';

export interface AccountsRepository {
  findById(id: string): Promise<Account | null>;
  findByEmail(email: Email): Promise<Account | null>;
  create(account: Account): Promise<void>;
  save(account: Account): Promise<void>;
}