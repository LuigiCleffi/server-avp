import type {
  MercadoLivreCredentials,
  MercadoLivreCredentialsRepository,
} from '@/application/ports/mercadoLivreCredentialsRepository';
import {
  MercadoLivreProviderImpl,
  type MercadoLivreTokenResponse,
  type MercadoLivreUser,
} from '@/infra/externalApis';
import { env } from '@/env';
import { NotFoundError } from '@/shared/errors/appErrors';

export type MercadoLivreConnectionResult = {
  sellerId: string;
  nickname: string;
  email: string;
  expiresAt: string;
};

export type ImportMercadoLivreCredentialsInput = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
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
    const { credentials, user } = await this.persistTokenResponse(tokenResponse);

    return {
      sellerId: credentials.sellerId,
      nickname: user.nickname,
      email: user.email,
      expiresAt: credentials.expiresAt.toISOString(),
    };
  }

  async importCredentials(input: ImportMercadoLivreCredentialsInput): Promise<MercadoLivreConnectionResult> {
    const { credentials, user } = await this.persistCredentials({
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresIn: input.expiresIn,
    });

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

  private createProvider(accessToken?: string): MercadoLivreProviderImpl {
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
    const { credentials } = await this.persistTokenResponse(refreshed);
    return credentials;
  }

  private async persistTokenResponse(
    tokenResponse: MercadoLivreTokenResponse,
  ): Promise<{ credentials: MercadoLivreCredentials; user: MercadoLivreUser }> {
    return this.persistCredentials({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
    });
  }

  private async persistCredentials(input: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }): Promise<{ credentials: MercadoLivreCredentials; user: MercadoLivreUser }> {
    const provider = this.createProvider(input.accessToken);
    const user = await provider.getAuthenticatedUser();
    const credentials = await this.credentialsRepository.save({
      sellerId: String(user.id),
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: new Date(Date.now() + input.expiresIn * 1000),
    });

    return {
      credentials,
      user,
    };
  }
}
