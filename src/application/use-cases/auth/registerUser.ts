import { randomUUID } from 'node:crypto';
import { ConflictError } from '@/shared/errors/appErrors';
import { Email } from '@/domain/value-objects/email';
import { Account } from '@/domain/entities/account';
import type { PasswordHasher } from '@/application/ports/passwordHasher';
import type { AccountsRepository } from '@/application/ports/accountsRepository';

export type RegisterUserInput = {
  name?: string;
  email: string;
  password: string;
};

export type RegisterUserOutput = {
  accountId: string;
};

export class RegisterUser {
  constructor(
    private readonly accountsRepository: AccountsRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  public async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const email = Email.create(input.email);

    const existing = await this.accountsRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('Email already in use');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const account = Account.createNew({
      id: randomUUID(),
      name: input.name,
      email: email.toString(),
      passwordHash,
    });

    await this.accountsRepository.create(account);

    return { accountId: account.id };
  }
}
