export type MercadoLivreCredentials = {
  sellerId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  updatedAt: Date;
  createdAt: Date;
};

export type SaveMercadoLivreCredentialsInput = {
  sellerId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export interface MercadoLivreCredentialsRepository {
  findBySellerId(sellerId: string): Promise<MercadoLivreCredentials | null>;
  save(input: SaveMercadoLivreCredentialsInput): Promise<MercadoLivreCredentials>;
}
