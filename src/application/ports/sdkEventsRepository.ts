export type SdkEventCreateResult =
  | { created: true }
  | { created: false; reason: 'DUPLICATE' };

export type SdkEventRecord = {
  id: string;
  eventId: string;
  type: string;
  playerId?: string | null;
  payload: unknown;
  occurredAt: Date;
  receivedAt: Date;
};

export interface SdkEventsRepository {
  createOnce(input: {
    gameId: string;
    apiKeyId: string;
    eventId: string;
    type: string;
    playerId?: string | null;
    payload: unknown;
    occurredAt: Date;
  }): Promise<SdkEventCreateResult>;

  listRecentByGameId(input: {
    gameId: string;
    playerId?: string;
    type?: string;
    take: number;
  }): Promise<SdkEventRecord[]>;
}
