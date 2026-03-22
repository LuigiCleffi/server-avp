import { NotFoundError } from '@/shared/errors/appErrors';
import type { UsersRepository } from '@/application/ports/usersRepository';

export type GetMeInput = {
  accountId: string;
};

export type GetMeOutput = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export class GetMe {
  constructor(private readonly usersRepository: UsersRepository) {}

  public async execute(input: GetMeInput): Promise<GetMeOutput> {
    const user = await this.usersRepository.findById(input.accountId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const primitives = user.toPrimitives();

    return {
      id: primitives.id,
      name: primitives.name,
      email: primitives.email,
      role: primitives.role,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }
}
