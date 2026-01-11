import { AuthError } from '@/shared/errors/appErrors';
import { Email } from '@/domain/value-objects/email';
import type { PasswordHasher } from '@/application/ports/passwordHasher';
import type { TokenService } from '@/application/ports/tokenService';
import type { UsersRepository } from '@/application/ports/usersRepository';

export type AuthenticateUserInput = {
  email: string;
  password: string;
};

export type AuthenticateUserOutput = {
  accessToken: string;
};

export class AuthenticateUser {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly accessTokenTtlSeconds: number = 60 * 60,
  ) {}

  public async execute(input: AuthenticateUserInput): Promise<AuthenticateUserOutput> {
    const email = Email.create(input.email);

    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new AuthError('Invalid credentials');
    }

    const primitives = user.toPrimitives();
    const ok = await this.passwordHasher.compare(input.password, primitives.passwordHash);
    if (!ok) {
      throw new AuthError('Invalid credentials');
    }

    const accessToken = await this.tokenService.signAccessToken(
      { sub: primitives.id, role: primitives.role },
      this.accessTokenTtlSeconds,
    );

    return { accessToken };
  }
}
