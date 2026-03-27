import { MercadoLivreClient } from './MercadoLivreClient';
import { MercadoLivreProvider } from '@/application/ports/mercadoLivreProvider';
import {
  MercadoLivreAuthorizationUrlParams,
  MercadoLivreOAuthConfig,
  MercadoLivreOrderSearchParams,
  MercadoLivreSearchParams,
} from './types';

/**
 * Mercado Livre Provider Implementation
 * Implements the MercadoLivreProvider interface for dependency injection
 */
export class MercadoLivreProviderImpl implements MercadoLivreProvider {
  private client: MercadoLivreClient;

  constructor(oauthConfig: MercadoLivreOAuthConfig) {
    this.client = new MercadoLivreClient(oauthConfig);
  }

  buildAuthorizationUrl(params?: MercadoLivreAuthorizationUrlParams) {
    return this.client.buildAuthorizationUrl(params);
  }

  async exchangeCodeForToken(code: string) {
    return this.client.exchangeCodeForToken(code);
  }

  async refreshAccessToken(refreshToken: string) {
    return this.client.refreshAccessToken(refreshToken);
  }

  async searchProducts(params: MercadoLivreSearchParams) {
    return this.client.searchProducts(params);
  }

  async getProductById(itemId: string) {
    return this.client.getProductById(itemId);
  }

  async getSellerInfo(sellerId: number) {
    return this.client.getSellerInfo(sellerId);
  }

  async getAuthenticatedUser() {
    return this.client.getAuthenticatedUser();
  }

  async listOrders(params: MercadoLivreOrderSearchParams) {
    return this.client.listOrders(params);
  }

  async getOrderBillingInfo(orderId: string | number) {
    return this.client.getOrderBillingInfo(orderId);
  }

  async getPackFiscalDocuments(packId: string | number) {
    return this.client.getPackFiscalDocuments(packId);
  }

  async getResource<T>(resourcePath: string) {
    return this.client.getResource<T>(resourcePath);
  }

  async getCategories(siteId?: string) {
    return this.client.getCategories(siteId);
  }

  async getCategoryDetails(categoryId: string) {
    return this.client.getCategoryDetails(categoryId);
  }

  async getProductsByCategory(categoryId: string, limit?: number, offset?: number) {
    return this.client.getProductsByCategory(categoryId, limit, offset);
  }

  async getSellerListings(sellerId: number, limit?: number, offset?: number) {
    return this.client.getSellerListings(sellerId, limit, offset);
  }

  updateAccessToken(newAccessToken: string): void {
    this.client.updateAccessToken(newAccessToken);
  }
}
