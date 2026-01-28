export type GameApiKeyStatus = 'ACTIVE' | 'REVOKED';

export type GameApiKeyRecord = {
  id: string;
  gameId: string;
  clientId: string;
  status: GameApiKeyStatus;
  createdAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
};

export interface GameApiKeysRepository {
  findById(id: string): Promise<GameApiKeyRecord | null>;

  findActiveByClientId(clientId: string): Promise<(GameApiKeyRecord & { secretHash: string }) | null>;

  touchLastUsedAt(id: string): Promise<void>;

  create(input: {
    gameId: string;
    clientId: string;
    secretHash: string;
  }): Promise<{ id: string; clientId: string }>;

  revokeById(id: string): Promise<void>;

  revokeAllActiveForGame(gameId: string): Promise<{ revokedCount: number }>;
}
