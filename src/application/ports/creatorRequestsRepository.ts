export type CreatorRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type CreatorRequestDto = {
  id: string;
  requestedById: string;
  status: CreatorRequestStatus;
  adminNotes: string | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
  createdAt: Date;
};

export interface CreatorRequestsRepository {
  createOnce(input: { requestedById: string }): Promise<{ requestId: string; created: boolean }>;

  findById(id: string): Promise<CreatorRequestDto | null>;

  review(input: {
    id: string;
    status: 'APPROVED' | 'REJECTED';
    reviewedById: string;
    adminNotes?: string | null;
  }): Promise<void>;
}
