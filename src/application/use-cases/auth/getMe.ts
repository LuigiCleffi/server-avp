import { NotFoundError } from '@/shared/errors/appErrors';
import type { AccountsRepository } from '@/application/ports/accountsRepository';

export type GetMeInput = {
  accountId: string;
};

export type GetMeOutput = {
  accountId: string;
  name: string;
  email: string;
  accountType: string;
  createdAt: string;
  updatedAt: string;
};

export class GetMe {
  constructor(private readonly accountsRepository: AccountsRepository) {}

  public async execute(input: GetMeInput): Promise<GetMeOutput> {
    const account = await this.accountsRepository.findById(input.accountId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    const primitives = account.toPrimitives();

    return {
      accountId: primitives.id,
      name: primitives.name,
      email: primitives.email,
      accountType: primitives.accountType,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }
}
