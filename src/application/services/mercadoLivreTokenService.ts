import type {
  MercadoLivreCredentials,
  MercadoLivreCredentialsRepository,
} from '@/application/ports/mercadoLivreCredentialsRepository';
import { MercadoLivreProviderImpl, type MercadoLivreTokenResponse } from '@/infra/externalApis';
import { env } from '@/env';
import { NotFoundError } from '@/shared/errors/appErrors';

export type MercadoLivreConnectionResult = {
  sellerId: string;
  nickname: string;
  email: string;
  expiresAt: string;
};

export type MercadoLivreCredentialStatus = {
  sellerId: string;
  expiresAt: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  updatedAt: string;
};

const REFRESH_WINDOW_MS = 30 * 60 * 1000;

export class MercadoLivreTokenService {
  private readonly refreshLocks = new Map<string, Promise<MercadoLivreCredentials>>();

  constructor(private readonly credentialsRepository: MercadoLivreCredentialsRepository) {}

  buildAuthorizationUrl(state?: string): string {
    return this.createProvider().buildAuthorizationUrl({ state });
  }

  async exchangeCode(code: string): Promise<MercadoLivreConnectionResult> {
    const provider = this.createProvider();
    const tokenResponse = await provider.exchangeCodeForToken(code);
    const credentials = await this.persistTokenResponse(tokenResponse);

    provider.updateAccessToken(credentials.accessToken);
    const user = await provider.getAuthenticatedUser();

    return {
      sellerId: credentials.sellerId,
      nickname: user.nickname,
      email: user.email,
      expiresAt: credentials.expiresAt.toISOString(),
    };
  }

  async getValidAccessToken(sellerId: string): Promise<string> {
    const credentials = await this.getCredentialsOrThrow(sellerId);
    if (!this.shouldRefresh(credentials.expiresAt)) {
      return credentials.accessToken;
    }

    const refreshed = await this.refreshWithLock(sellerId);
    return refreshed.accessToken;
  }

  async getCredentialStatus(sellerId: string): Promise<MercadoLivreCredentialStatus> {
    const current = await this.getCredentialsOrThrow(sellerId);
    const ensured = this.shouldRefresh(current.expiresAt)
      ? await this.refreshWithLock(sellerId)
      : current;

    return {
      sellerId: ensured.sellerId,
      expiresAt: ensured.expiresAt.toISOString(),
      isExpired: ensured.expiresAt.getTime() <= Date.now(),
      isExpiringSoon: this.shouldRefresh(ensured.expiresAt),
      updatedAt: ensured.updatedAt.toISOString(),
    };
  }

  async refreshCredentials(sellerId: string): Promise<MercadoLivreCredentialStatus> {
    const refreshed = await this.refreshWithLock(sellerId);

    return {
      sellerId: refreshed.sellerId,
      expiresAt: refreshed.expiresAt.toISOString(),
      isExpired: false,
      isExpiringSoon: this.shouldRefresh(refreshed.expiresAt),
      updatedAt: refreshed.updatedAt.toISOString(),
    };
  }

  private createProvider(accessToken: string = env.mercadoLivreAccessToken): MercadoLivreProviderImpl {
    return new MercadoLivreProviderImpl({
      clientId: env.mercadoLivreClientId,
      clientSecret: env.mercadoLivreClientSecret,
      redirectUri: env.mercadoLivreRedirectUri,
      accessToken,
    });
  }

  private shouldRefresh(expiresAt: Date): boolean {
    return Date.now() >= expiresAt.getTime() - REFRESH_WINDOW_MS;
  }

  private async getCredentialsOrThrow(sellerId: string): Promise<MercadoLivreCredentials> {
    const credentials = await this.credentialsRepository.findBySellerId(sellerId);
    if (!credentials) {
      throw new NotFoundError('Mercado Livre credentials not found for seller', { sellerId });
    }

    return credentials;
  }

  private async refreshWithLock(sellerId: string): Promise<MercadoLivreCredentials> {
    const ongoing = this.refreshLocks.get(sellerId);
    if (ongoing) {
      return ongoing;
    }

    const refreshPromise = this.refreshCredentialsInternal(sellerId).finally(() => {
      this.refreshLocks.delete(sellerId);
    });

    this.refreshLocks.set(sellerId, refreshPromise);
    return refreshPromise;
  }

  private async refreshCredentialsInternal(sellerId: string): Promise<MercadoLivreCredentials> {
    const current = await this.getCredentialsOrThrow(sellerId);
    if (!this.shouldRefresh(current.expiresAt)) {
      return current;
    }

    const provider = this.createProvider(current.accessToken);
    const refreshed = await provider.refreshAccessToken(current.refreshToken);
    return this.persistTokenResponse(refreshed);
  }

  private async persistTokenResponse(tokenResponse: MercadoLivreTokenResponse): Promise<MercadoLivreCredentials> {
    const provider = this.createProvider(tokenResponse.access_token);
    const user = await provider.getAuthenticatedUser();

    return this.credentialsRepository.save({
      sellerId: String(user.id),
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
    });
  }
}
