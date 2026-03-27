/**
 * Example: How to use Mercado Livre Provider in your application
 *
 * This file demonstrates how to integrate the MercadoLivreProvider
 * into your use cases and business logic.
 *
 * DELETE THIS FILE AFTER UNDERSTANDING THE PATTERN
 */

import { MercadoLivreProviderImpl } from '@/infra/externalApis';
import { env } from '@/env';
import {
  ExternalApiError,
  ExternalApiAuthError,
  ExternalApiRateLimitError,
  ExternalApiNotFoundError,
} from '@/shared/errors/ExternalApiError';

/**
 * Example 1: Initialize the provider
 */
export function initializeMercadoLivreProvider() {
  const mercadoLivre = new MercadoLivreProviderImpl({
    clientId: env.mercadoLivreClientId,
    clientSecret: env.mercadoLivreClientSecret,
    redirectUri: env.mercadoLivreRedirectUri,
    accessToken: env.mercadoLivreAccessToken,
  });

  return mercadoLivre;
}

/**
 * Example 2: Create a use case that depends on MercadoLivreProvider
 */
export class SearchProductsUseCase {
  constructor(private mercadoLivreProvider: InstanceType<typeof MercadoLivreProviderImpl>) {}

  async execute(query: string, limit: number = 50) {
    try {
      const results = await this.mercadoLivreProvider.searchProducts({
        q: query,
        limit,
        sort: 'price_asc',
      });

      return {
        total: results.paging.total,
        products: results.results.map((product) => ({
          id: product.id,
          title: product.title,
          price: product.price,
          currency: product.currency_id,
          availability: product.available_quantity,
          seller: product.seller_id,
          url: product.permalink,
        })),
      };
    } catch (error) {
      if (error instanceof ExternalApiAuthError) {
        throw new Error('Mercado Livre authentication failed. Check your access token.');
      } else if (error instanceof ExternalApiRateLimitError) {
        throw new Error(`Rate limited. Retry after ${error.retryAfter}s`);
      } else if (error instanceof ExternalApiError) {
        throw new Error(`Mercado Livre error: ${error.message}`);
      }
      throw error;
    }
  }
}

/**
 * Example 3: Get product details
 */
export class GetProductDetailsUseCase {
  constructor(private mercadoLivreProvider: InstanceType<typeof MercadoLivreProviderImpl>) {}

  async execute(productId: string) {
    try {
      const product = await this.mercadoLivreProvider.getProductById(productId);

      return {
        id: product.id,
        title: product.title,
        price: product.price,
        currency: product.currency_id,
        condition: product.condition,
        available: product.available_quantity,
        sold: product.sold_quantity,
        seller: product.seller_id,
        permalink: product.permalink,
      };
    } catch (error) {
      if (error instanceof ExternalApiNotFoundError) {
        throw new Error(`Product ${productId} not found on Mercado Livre`);
      } else if (error instanceof ExternalApiError) {
        throw new Error(`Failed to get product details: ${error.message}`);
      }
      throw error;
    }
  }
}

/**
 * Example 4: Get products by category
 */
export class GetProductsByCategoryUseCase {
  constructor(private mercadoLivreProvider: InstanceType<typeof MercadoLivreProviderImpl>) {}

  async execute(categoryId: string, page: number = 1, limit: number = 50) {
    try {
      const offset = (page - 1) * limit;

      const results = await this.mercadoLivreProvider.getProductsByCategory(
        categoryId,
        limit,
        offset
      );

      return {
        category: categoryId,
        total: results.paging.total,
        page,
        totalPages: Math.ceil(results.paging.total / limit),
        products: results.results.map((product) => ({
          id: product.id,
          title: product.title,
          price: product.price,
          available: product.available_quantity,
        })),
      };
    } catch (error) {
      if (error instanceof ExternalApiNotFoundError) {
        throw new Error(`Category ${categoryId} not found`);
      } else if (error instanceof ExternalApiError) {
        throw new Error(`Failed to get category products: ${error.message}`);
      }
      throw error;
    }
  }
}

/**
 * Example 5: Get seller information
 */
export class GetSellerInfoUseCase {
  constructor(private mercadoLivreProvider: InstanceType<typeof MercadoLivreProviderImpl>) {}

  async execute(sellerId: number) {
    try {
      const seller = await this.mercadoLivreProvider.getSellerInfo(sellerId);

      return {
        id: seller.id,
        nickname: seller.nickname,
        email: seller.email,
        status: seller.status?.level_id,
        isPowerSeller: seller.status?.power_seller_status === 'platinum' || seller.status?.power_seller_status === 'gold',
      };
    } catch (error) {
      if (error instanceof ExternalApiNotFoundError) {
        throw new Error(`Seller ${sellerId} not found`);
      } else if (error instanceof ExternalApiError) {
        throw new Error(`Failed to get seller info: ${error.message}`);
      }
      throw error;
    }
  }
}

/**
 * Example 6: Test all methods (for debugging)
 */
export async function testAllMercadoLivreMethods() {
  const provider = initializeMercadoLivreProvider();

  try {
    console.log('1. Testing authenticated user...');
    const user = await provider.getAuthenticatedUser();
    console.log('✓ User:', user.nickname);

    console.log('\n2. Testing categories...');
    const categories = await provider.getCategories();
    console.log(`✓ Found ${categories.length} categories`);

    console.log('\n3. Testing product search...');
    const searchResults = await provider.searchProducts({
      q: 'notebook',
      limit: 5,
    });
    console.log(`✓ Found ${searchResults.paging.total} products matching "notebook"`);

    if (searchResults.results.length > 0) {
      const firstProduct = searchResults.results[0];
      console.log(`\n4. Testing product details for: ${firstProduct.title}...`);
      const productDetails = await provider.getProductById(firstProduct.id);
      console.log('✓ Product details retrieved');

      console.log(`\n5. Testing seller info for seller: ${firstProduct.seller_id}...`);
      const sellerInfo = await provider.getSellerInfo(Number(firstProduct.seller_id));
      console.log(`✓ Seller "${sellerInfo.nickname}" found`);
    }

    console.log('\n✓ All tests passed!');
  } catch (error) {
    console.error('✗ Test failed:', error);
  }
}

/**
 * INTEGRATION STEPS:
 *
 * 1. Add MercadoLivreProviderImpl to your dependency injection container:
 *
 *    export function setupDependencies() {
 *      const mercadoLivreProvider = new MercadoLivreProviderImpl({
 *        clientId: env.mercadoLivreClientId,
 *        clientSecret: env.mercadoLivreClientSecret,
 *        redirectUri: env.mercadoLivreRedirectUri,
 *        accessToken: env.mercadoLivreAccessToken,
 *      });
 *
 *      return {
 *        mercadoLivreProvider,
 *        // ... other dependencies
 *      };
 *    }
 *
 * 2. Use in use cases:
 *
 *    const deps = setupDependencies();
 *    const searchUseCase = new SearchProductsUseCase(deps.mercadoLivreProvider);
 *    const results = await searchUseCase.execute('laptop');
 *
 * 3. Export from routes:
 *
 *    fastify.get('/api/products/search', async (request, reply) => {
 *      const query = request.query.q as string;
 *      const results = await searchUseCase.execute(query);
 *      reply.send(results);
 *    });
 */
