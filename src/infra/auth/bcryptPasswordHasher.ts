import bcrypt from 'bcryptjs';
import type { PasswordHasher } from '@/application/ports/passwordHasher';

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly saltRounds: number = 10) {}

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
