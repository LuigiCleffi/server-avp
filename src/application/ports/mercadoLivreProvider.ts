import {
  MercadoLivreAuthorizationUrlParams,
  MercadoLivreBillingInfo,
  MercadoLivreSearchParams,
  MercadoLivreSearchResult,
  MercadoLivreItem,
  MercadoLivreSeller,
  MercadoLivreUser,
  MercadoLivreCategory,
  MercadoLivreOrderSearchParams,
  MercadoLivreOrderSearchResult,
  MercadoLivrePackFiscalDocuments,
  MercadoLivreTokenResponse,
} from '@/infra/externalApis/mercadoLivre/types';

/**
 * Port interface for Mercado Livre API calls.
 * This abstraction allows for testing and multiple implementations.
 */
export interface MercadoLivreProvider {
  buildAuthorizationUrl(params?: MercadoLivreAuthorizationUrlParams): string;
  exchangeCodeForToken(code: string): Promise<MercadoLivreTokenResponse>;
  refreshAccessToken(refreshToken: string): Promise<MercadoLivreTokenResponse>;
  searchProducts(params: MercadoLivreSearchParams): Promise<MercadoLivreSearchResult>;
  getProductById(itemId: string): Promise<MercadoLivreItem>;
  getSellerInfo(sellerId: number): Promise<MercadoLivreSeller>;
  getAuthenticatedUser(): Promise<MercadoLivreUser>;
  listOrders(params: MercadoLivreOrderSearchParams): Promise<MercadoLivreOrderSearchResult>;
  getOrderBillingInfo(orderId: string | number): Promise<MercadoLivreBillingInfo>;
  getPackFiscalDocuments(packId: string | number): Promise<MercadoLivrePackFiscalDocuments>;
  getResource<T>(resourcePath: string): Promise<T>;
  getCategories(siteId?: string): Promise<MercadoLivreCategory[]>;
  getCategoryDetails(categoryId: string): Promise<MercadoLivreCategory>;
  getProductsByCategory(categoryId: string, limit?: number, offset?: number): Promise<MercadoLivreSearchResult>;
  getSellerListings(sellerId: number, limit?: number, offset?: number): Promise<MercadoLivreSearchResult>;
  updateAccessToken(newAccessToken: string): void;
}
