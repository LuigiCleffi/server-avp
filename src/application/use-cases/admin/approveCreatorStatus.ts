import type { CreatorRequestsRepository } from '@/application/ports/creatorRequestsRepository';
import type { UsersRepository } from '@/application/ports/usersRepository';
import { NotFoundError } from '@/shared/errors/appErrors';

export type ApproveCreatorStatusInput = {
  requestId: string;
  adminUserId: string;
  adminNotes?: string | null;
};

export type ApproveCreatorStatusOutput = {
  approved: true;
};

export class ApproveCreatorStatus {
  constructor(
    private readonly creatorRequestsRepository: CreatorRequestsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  public async execute(input: ApproveCreatorStatusInput): Promise<ApproveCreatorStatusOutput> {
    const req = await this.creatorRequestsRepository.findById(input.requestId);
    if (!req) throw new NotFoundError('Creator request not found', { requestId: input.requestId });

    await this.creatorRequestsRepository.review({
      id: input.requestId,
      status: 'APPROVED',
      reviewedById: input.adminUserId,
      adminNotes: input.adminNotes ?? null,
    });

    const user = await this.usersRepository.findById(req.requestedById);
    if (!user) throw new NotFoundError('User not found', { userId: req.requestedById });

    user.promoteToGameCreator();
    await this.usersRepository.save(user);

    return { approved: true };
  }
}
