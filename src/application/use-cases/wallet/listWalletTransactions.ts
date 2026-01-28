import type { WalletRepository } from '@/application/ports/walletRepository';

export type ListWalletTransactionsInput = {
  userId: string;
  page: number;
  pageSize: number;
};

export type ListWalletTransactionsOutput = {
  items: Array<{
    id: string;
    type: 'CREDIT' | 'DEBIT';
    amount: string;
    currency: string;
    reason: string;
    createdAt: string;
  }>;
  page: number;
  pageSize: number;
  total: number;
};

export class ListWalletTransactions {
  constructor(private readonly walletRepository: WalletRepository) {}

  public async execute(input: ListWalletTransactionsInput): Promise<ListWalletTransactionsOutput> {
    const result = await this.walletRepository.listLedgerEntriesByUserId({
      userId: input.userId,
      page: input.page,
      pageSize: input.pageSize,
    });

    return {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      items: result.items.map((e) => ({
        id: e.id,
        type: e.type,
        amount: e.amount,
        currency: e.currency,
        reason: e.reason,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }
}
