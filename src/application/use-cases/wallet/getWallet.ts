import type { WalletRepository } from '@/application/ports/walletRepository';

export type GetWalletInput = {
  userId: string;
};

export type GetWalletOutput = {
  walletId: string;
  currency: string;
  balance: string;
};

export class GetWallet {
  constructor(private readonly walletRepository: WalletRepository) {}

  public async execute(input: GetWalletInput): Promise<GetWalletOutput> {
    const wallet = await this.walletRepository.getWalletBalanceByUserId(input.userId);

    return {
      walletId: wallet.walletId,
      currency: wallet.currency,
      balance: wallet.balance,
    };
  }
}
