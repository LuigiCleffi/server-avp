#!/usr/bin/env tsx

/**
 * Standalone test script for Mercado Livre API integration
 * Run with: npx tsx test-mercado-livre.ts
 *
 * This script reads from your .env file automatically
 */

import { MercadoLivreProviderImpl } from './src/infra/externalApis';
import { env } from './src/env';
import {
  ExternalApiError,
  ExternalApiAuthError,
  ExternalApiRateLimitError,
  ExternalApiNotFoundError,
} from './src/shared/errors/ExternalApiError';

async function testMercadoLivreIntegration() {
  console.log('🚀 Testing Mercado Livre API Integration...\n');

  // Check if credentials are configured
  if (!env.mercadoLivreAccessToken) {
    console.error('❌ MERCADO_LIVRE_ACCESS_TOKEN not found in .env');
    console.log('Please add your Mercado Livre access token to .env');
    process.exit(1);
  }

  try {
    // Initialize provider
    const mercadoLivre = new MercadoLivreProviderImpl({
      clientId: env.mercadoLivreClientId,
      clientSecret: env.mercadoLivreClientSecret,
      redirectUri: env.mercadoLivreRedirectUri,
      accessToken: env.mercadoLivreAccessToken,
    });

    console.log('✅ Provider initialized successfully');

    // Test 1: Get authenticated user
    console.log('\n📋 Test 1: Getting authenticated user...');
    const user = await mercadoLivre.getAuthenticatedUser();
    console.log(`✅ User: ${user.nickname} (${user.email})`);

    // Test 2: Get categories
    console.log('\n📂 Test 2: Getting categories...');
    const categories = await mercadoLivre.getCategories();
    console.log(`✅ Found ${categories.length} categories`);
    console.log(`   First category: ${categories[0]?.name} (${categories[0]?.id})`);

    // Test 3: Search products
    console.log('\n🔍 Test 3: Searching for "notebook"...');
    const searchResults = await mercadoLivre.searchProducts({
      q: 'notebook',
      limit: 5,
      sort: 'price_asc',
    });
    console.log(`✅ Found ${searchResults.paging.total} products`);
    console.log(`   Showing first ${searchResults.results.length} results:`);

    searchResults.results.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.title} - R$ ${product.price}`);
    });

    // Test 4: Get product details (if we have results)
    if (searchResults.results.length > 0) {
      const firstProduct = searchResults.results[0];
      console.log(`\n📦 Test 4: Getting details for "${firstProduct.title}"...`);
      const productDetails = await mercadoLivre.getProductById(firstProduct.id);
      console.log(`✅ Product: ${productDetails.title}`);
      console.log(`   Price: R$ ${productDetails.price}`);
      console.log(`   Available: ${productDetails.available_quantity}`);
      console.log(`   Condition: ${productDetails.condition}`);
      console.log(`   Seller ID: ${productDetails.seller_id}`);

      // Test 5: Get seller info
      console.log(`\n👤 Test 5: Getting seller info for ID ${productDetails.seller_id}...`);
      const sellerInfo = await mercadoLivre.getSellerInfo(productDetails.seller_id);
      console.log(`✅ Seller: ${sellerInfo.nickname}`);
      console.log(`   Status: ${sellerInfo.status?.level_id}`);
      console.log(`   Power Seller: ${sellerInfo.status?.power_seller_status}`);
    }

    console.log('\n🎉 All tests passed! Mercado Livre integration is working correctly.');
    console.log('\n📊 Summary:');
    console.log('   ✅ Authentication');
    console.log('   ✅ Product search');
    console.log('   ✅ Product details');
    console.log('   ✅ Seller information');
    console.log('   ✅ Categories');

  } catch (error) {
    console.error('\n❌ Test failed:');

    if (error instanceof ExternalApiAuthError) {
      console.error('   Authentication failed - check your access token');
      console.error('   Make sure your token is valid and not expired');
    } else if (error instanceof ExternalApiRateLimitError) {
      console.error(`   Rate limited - retry after ${error.retryAfter}s`);
    } else if (error instanceof ExternalApiNotFoundError) {
      console.error('   Resource not found');
    } else if (error instanceof ExternalApiError) {
      console.error(`   API Error (${error.statusCode}): ${error.message}`);
    } else {
      console.error('   Unexpected error:', error);
    }

    process.exit(1);
  }
}

// Run the test
testMercadoLivreIntegration().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
