import type {
  TournamentManagerCreateTournamentInput,
  TournamentManagerCreateTournamentOutput,
  TournamentManagerProvider,
} from '@/application/ports/tournamentManagerProvider';
import { AppError } from '@/shared/errors/appErrors';

type ErrorResponse = {
  code?: number;
  message?: string;
};

export class HttpTournamentManagerProvider implements TournamentManagerProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  public async createTournament(
    input: TournamentManagerCreateTournamentInput,
  ): Promise<TournamentManagerCreateTournamentOutput> {
    if (!this.baseUrl) {
      throw new AppError({
        code: 'TOURNAMENT_MANAGER_NOT_CONFIGURED',
        message: 'Tournament manager base URL is not configured',
        statusCode: 503,
      });
    }

    const url = new URL('/v0/tournaments', this.baseUrl).toString();

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
      },
      body: JSON.stringify({
        name: input.name,
        prize: input.prize,
        maxPlayers: input.maxPlayers,
        game: input.game,
      }),
    });

    const text = await res.text();

    if (res.status !== 201) {
      let parsed: ErrorResponse | undefined;
      try {
        parsed = text ? (JSON.parse(text) as ErrorResponse) : undefined;
      } catch {
        parsed = undefined;
      }

      throw new AppError({
        code: 'TOURNAMENT_MANAGER_REQUEST_FAILED',
        message: parsed?.message ?? 'Tournament manager request failed',
        statusCode: 502,
        details: {
          upstreamStatus: res.status,
          upstreamCode: parsed?.code,
        },
      });
    }

    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new AppError({
        code: 'TOURNAMENT_MANAGER_INVALID_RESPONSE',
        message: 'Tournament manager returned invalid JSON',
        statusCode: 502,
      });
    }

    const jsonObj = json as { id?: unknown; ID?: unknown };
    const id = (typeof jsonObj.id === 'string' && jsonObj.id.length > 0)
      ? jsonObj.id
      : (typeof jsonObj.ID === 'string' && jsonObj.ID.length > 0)
        ? jsonObj.ID
        : undefined;

    if (!id) {
      throw new AppError({
        code: 'TOURNAMENT_MANAGER_INVALID_RESPONSE',
        message: 'Tournament manager response missing tournament id',
        statusCode: 502,
      });
    }

    return { id };
  }
}
