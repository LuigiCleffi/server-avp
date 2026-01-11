import { randomUUID } from 'node:crypto';
import { ConflictError } from '@/shared/errors/appErrors';
import { Email } from '@/domain/value-objects/email';
import { User } from '@/domain/entities/user';
import type { PasswordHasher } from '@/application/ports/passwordHasher';
import type { UsersRepository } from '@/application/ports/usersRepository';

export type RegisterUserInput = {
  name: string;
  email: string;
  password: string;
};

export type RegisterUserOutput = {
  userId: string;
};

export class RegisterUser {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  public async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const email = Email.create(input.email);

    const existing = await this.usersRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('Email already in use');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const user = User.createNew({
      id: randomUUID(),
      name: input.name,
      email: email.toString(),
      passwordHash,
    });

    await this.usersRepository.create(user);

    return { userId: user.id };
  }
}
