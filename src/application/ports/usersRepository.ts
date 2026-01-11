import type { User } from '@/domain/entities/user';
import type { Email } from '@/domain/value-objects/email';

export interface UsersRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  create(user: User): Promise<void>;
  save(user: User): Promise<void>;
}
