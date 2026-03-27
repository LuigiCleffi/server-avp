import { BaseExternalApiClient, ExternalApiClientConfig } from '../BaseExternalApiClient';
import {
  MercadoLivreAuthorizationUrlParams,
  MercadoLivreBillingInfo,
  MercadoLivreOAuthConfig,
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
} from './types';

/**
 * Mercado Livre API Client
 * Handles all interactions with the Mercado Livre API for consuming product and seller data.
 */
export class MercadoLivreClient extends BaseExternalApiClient {
  private accessToken: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(oauthConfig: MercadoLivreOAuthConfig) {
    const config: ExternalApiClientConfig = {
      baseURL: 'https://api.mercadolibre.com',
    };

    // Initialize with access token in default headers
    super(config, 'Mercado Livre', {
      Authorization: `Bearer ${oauthConfig.accessToken}`,
    });

    this.accessToken = oauthConfig.accessToken;
    this.clientId = oauthConfig.clientId;
    this.clientSecret = oauthConfig.clientSecret;
    this.redirectUri = oauthConfig.redirectUri;
  }

  buildAuthorizationUrl(params?: MercadoLivreAuthorizationUrlParams): string {
    const queryParams = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
    });

    if (params?.state) {
      queryParams.append('state', params.state);
    }

    return `https://auth.mercadolivre.com.br/authorization?${queryParams.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<MercadoLivreTokenResponse> {
    const payload = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.redirectUri,
    });

    return this.post<MercadoLivreTokenResponse>('/oauth/token', payload.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<MercadoLivreTokenResponse> {
    const payload = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });

    return this.post<MercadoLivreTokenResponse>('/oauth/token', payload.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  /**
   * Search products on Mercado Livre
   * @param params Search parameters
   * @returns Search results
   */
  async searchProducts(params: MercadoLivreSearchParams): Promise<MercadoLivreSearchResult> {
    const queryParams = new URLSearchParams();

    if (params.q) queryParams.append('q', params.q);
    if (params.category) queryParams.append('category', params.category);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.sort) queryParams.append('sort', params.sort);

    const path = `/sites/MLB/search?${queryParams.toString()}`;
    return this.get<MercadoLivreSearchResult>(path);
  }

  /**
   * Get product details by ID
   * @param itemId Product/Item ID
   * @returns Product details
   */
  async getProductById(itemId: string): Promise<MercadoLivreItem> {
    return this.get<MercadoLivreItem>(`/items/${itemId}`);
  }

  /**
   * Get seller information
   * @param sellerId Seller ID
   * @returns Seller information
   */
  async getSellerInfo(sellerId: number): Promise<MercadoLivreSeller> {
    return this.get<MercadoLivreSeller>(`/users/${sellerId}`);
  }

  /**
   * Get authenticated user information
   * @returns Current authenticated user information
   */
  async getAuthenticatedUser(): Promise<MercadoLivreUser> {
    return this.get<MercadoLivreUser>('/users/me');
  }

  async listOrders(params: MercadoLivreOrderSearchParams): Promise<MercadoLivreOrderSearchResult> {
    const queryParams = new URLSearchParams({
      seller: params.sellerId.toString(),
      sort: params.sort ?? 'date_desc',
    });

    if (params.orderStatus) queryParams.append('order.status', params.orderStatus);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    return this.get<MercadoLivreOrderSearchResult>(`/orders/search?${queryParams.toString()}`);
  }

  async getOrderBillingInfo(orderId: string | number): Promise<MercadoLivreBillingInfo> {
    return this.get<MercadoLivreBillingInfo>(`/orders/${orderId}/billing_info`);
  }

  async getPackFiscalDocuments(packId: string | number): Promise<MercadoLivrePackFiscalDocuments> {
    return this.get<MercadoLivrePackFiscalDocuments>(`/packs/${packId}/fiscal_documents`);
  }

  async getResource<T>(resourcePath: string): Promise<T> {
    const normalizedPath = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;
    return this.get<T>(normalizedPath);
  }

  /**
   * Search categories
   * @param siteId Site ID (e.g., 'MLB' for Brazil)
   * @returns List of categories
   */
  async getCategories(siteId: string = 'MLB'): Promise<MercadoLivreCategory[]> {
    return this.get<MercadoLivreCategory[]>(`/sites/${siteId}/categories`);
  }

  /**
   * Get category details
   * @param categoryId Category ID
   * @returns Category information
   */
  async getCategoryDetails(categoryId: string): Promise<MercadoLivreCategory> {
    return this.get<MercadoLivreCategory>(`/categories/${categoryId}`);
  }

  /**
   * Get products by category with pagination
   * @param categoryId Category ID
   * @param limit Number of items to retrieve
   * @param offset Offset for pagination
   * @returns Products in category
   */
  async getProductsByCategory(
    categoryId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MercadoLivreSearchResult> {
    const queryParams = new URLSearchParams({
      category: categoryId,
      limit: limit.toString(),
      offset: offset.toString(),
    });

    return this.get<MercadoLivreSearchResult>(`/sites/MLB/search?${queryParams.toString()}`);
  }

  /**
   * Get seller's listings
   * @param sellerId Seller ID
   * @param limit Number of items to retrieve
   * @param offset Offset for pagination
   * @returns Seller's products
   */
  async getSellerListings(
    sellerId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<MercadoLivreSearchResult> {
    const queryParams = new URLSearchParams({
      seller_id: sellerId.toString(),
      limit: limit.toString(),
      offset: offset.toString(),
    });

    return this.get<MercadoLivreSearchResult>(`/sites/MLB/search?${queryParams.toString()}`);
  }

  /**
   * Update authorization token (in case it changes or gets refreshed)
   * @param newAccessToken New access token
   */
  updateAccessToken(newAccessToken: string): void {
    this.accessToken = newAccessToken;
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
  }
}
