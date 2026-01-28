import type { CreatorRequestsRepository } from '@/application/ports/creatorRequestsRepository';

export type RequestCreatorStatusInput = {
  userId: string;
};

export type RequestCreatorStatusOutput = {
  requestId: string;
  created: boolean;
};

export class RequestCreatorStatus {
  constructor(private readonly creatorRequestsRepository: CreatorRequestsRepository) {}

  public async execute(input: RequestCreatorStatusInput): Promise<RequestCreatorStatusOutput> {
    return this.creatorRequestsRepository.createOnce({ requestedById: input.userId });
  }
}
