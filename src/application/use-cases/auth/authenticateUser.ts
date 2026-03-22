import { AuthError } from '@/shared/errors/appErrors';
import { Email } from '@/domain/value-objects/email';
import type { PasswordHasher } from '@/application/ports/passwordHasher';
import type { TokenService } from '@/application/ports/tokenService';
import type { AccountsRepository } from '@/application/ports/accountsRepository';

export type AuthenticateUserInput = {
  email: string;
  password: string;
};

export type AuthenticateUserOutput = {
  token: string;
};

export class AuthenticateUser {
  constructor(
    private readonly accountsRepository: AccountsRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly accessTokenTtlSeconds: number = 60 * 60,
  ) {}

  public async execute(input: AuthenticateUserInput): Promise<AuthenticateUserOutput> {
    const email = Email.create(input.email);

    const account = await this.accountsRepository.findByEmail(email);
    if (!account) {
      throw new AuthError('Invalid credentials');
    }

    const primitives = account.toPrimitives();
    const ok = await this.passwordHasher.compare(input.password, primitives.passwordHash);
    if (!ok) {
      throw new AuthError('Invalid credentials');
    }

    const accessToken = await this.tokenService.signAccessToken(
      { account_id: primitives.id, role: primitives.accountType },
      this.accessTokenTtlSeconds,
    );

    return { token: accessToken };
  }
}
