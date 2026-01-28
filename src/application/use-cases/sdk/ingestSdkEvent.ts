import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PasswordHasher } from '@/application/ports/passwordHasher';
import type { GameApiKeysRepository } from '@/application/ports/gameApiKeysRepository';
import type { SdkNoncesRepository } from '@/application/ports/sdkNoncesRepository';
import type { SdkEventsRepository } from '@/application/ports/sdkEventsRepository';
import { AppError } from '@/shared/errors/appErrors';
import { z } from 'zod';

const sdkEnvelopeSchema = z.object({
  eventId: z.string().min(1),
  gameClientId: z.string().min(1),
  timestamp: z.number().int().positive(),
  nonce: z.string().min(1),
  type: z.enum(['SESSION_STARTED', 'SESSION_ENDED', 'SCORE_UPDATED', 'MATCH_RESULT', 'CUSTOM']),
  payload: z.unknown(),
});

const payloadPlayerIdSchema = z.object({
  playerId: z.string().min(1),
});

export type IngestSdkEventInput = {
  rawBody: string;
  headers: {
    clientId: string;
    secret: string;
    timestamp: number;
    nonce: string;
    signature: string;
  };
};

export type IngestSdkEventOutput = {
  received: true;
  duplicate?: boolean;
};

function badRequest(code: string, message: string, details?: object): AppError {
  return new AppError({ code, message, statusCode: 400, details });
}

function unauthorized(code: string, message: string, details?: object): AppError {
  return new AppError({ code, message, statusCode: 401, details });
}

function conflict(code: string, message: string, details?: object): AppError {
  return new AppError({ code, message, statusCode: 409, details });
}

function computeSignature(secret: string, timestamp: number, nonce: string, rawBody: string): string {
  const message = `${timestamp}.${nonce}.${rawBody}`;
  return createHmac('sha256', secret).update(message).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export class IngestSdkEvent {
  private readonly maxSkewMs = 5 * 60 * 1000;

  constructor(
    private readonly gameApiKeysRepository: GameApiKeysRepository,
    private readonly secretHasher: PasswordHasher,
    private readonly sdkNoncesRepository: SdkNoncesRepository,
    private readonly sdkEventsRepository: SdkEventsRepository,
  ) {}

  public async execute(input: IngestSdkEventInput): Promise<IngestSdkEventOutput> {
    if (!input.rawBody) {
      throw badRequest('SDK_RAW_BODY_MISSING', 'Raw body is required');
    }

    const now = Date.now();
    const requestTsMs = input.headers.timestamp;
    if (!Number.isFinite(requestTsMs)) {
      throw badRequest('SDK_TIMESTAMP_INVALID', 'Invalid timestamp');
    }

    if (Math.abs(now - requestTsMs) > this.maxSkewMs) {
      throw unauthorized('SDK_TIMESTAMP_OUT_OF_RANGE', 'Request timestamp is out of allowed window');
    }

    const key = await this.gameApiKeysRepository.findActiveByClientId(input.headers.clientId);
    if (!key) {
      throw unauthorized('SDK_CLIENT_ID_INVALID', 'Invalid client ID');
    }

    const secretOk = await this.secretHasher.compare(input.headers.secret, key.secretHash);
    if (!secretOk) {
      throw unauthorized('SDK_SECRET_INVALID', 'Invalid SDK secret');
    }

    const expectedSig = computeSignature(
      input.headers.secret,
      input.headers.timestamp,
      input.headers.nonce,
      input.rawBody,
    );

    if (!safeEqual(expectedSig, input.headers.signature)) {
      throw unauthorized('SDK_SIGNATURE_INVALID', 'Invalid signature');
    }

    // Anti-replay: nonce can only be used once per key.
    const nonceResult = await this.sdkNoncesRepository.createOnce({
      apiKeyId: key.id,
      nonce: input.headers.nonce,
    });

    if (!nonceResult.created) {
      throw conflict('SDK_REPLAY_DETECTED', 'Nonce has already been used');
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(input.rawBody);
    } catch {
      throw badRequest('SDK_JSON_INVALID', 'Body must be valid JSON');
    }

    const envelope = sdkEnvelopeSchema.safeParse(parsedJson);
    if (!envelope.success) {
      throw badRequest('SDK_EVENT_INVALID', 'Invalid SDK event payload', envelope.error.flatten());
    }

    if (envelope.data.gameClientId !== input.headers.clientId) {
      throw unauthorized('SDK_CLIENT_ID_MISMATCH', 'gameClientId does not match client ID header');
    }

    if (envelope.data.nonce !== input.headers.nonce) {
      throw unauthorized('SDK_NONCE_MISMATCH', 'nonce does not match nonce header');
    }

    if (envelope.data.timestamp !== input.headers.timestamp) {
      throw unauthorized('SDK_TIMESTAMP_MISMATCH', 'timestamp does not match timestamp header');
    }

    const occurredAt = new Date(envelope.data.timestamp);

    const playerIdParsed = payloadPlayerIdSchema.safeParse(envelope.data.payload);
    const playerId = playerIdParsed.success ? playerIdParsed.data.playerId : null;

    const createResult = await this.sdkEventsRepository.createOnce({
      gameId: key.gameId,
      apiKeyId: key.id,
      eventId: envelope.data.eventId,
      type: envelope.data.type,
      playerId,
      payload: envelope.data.payload,
      occurredAt,
    });

    await this.gameApiKeysRepository.touchLastUsedAt(key.id);

    if (!createResult.created) {
      // Idempotent success
      return { received: true, duplicate: true };
    }

    return { received: true };
  }
}
