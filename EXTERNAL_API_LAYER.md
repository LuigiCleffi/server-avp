# External API Layer - Usage Guide

## Overview

The external API layer provides a standardized way to interact with third-party APIs like Mercado Livre and Shopee. It includes:

- **BaseExternalApiClient**: Abstract base class with common HTTP methods and centralized error handling
- **MercadoLivreClient**: Mercado Livre API implementation
- **Custom Exceptions**: Specialized error handling for different HTTP statuses
- **Port Interfaces**: For dependency injection following your clean architecture pattern

## Architecture

```
src/
├── application/ports/
│   └── mercadoLivreProvider.ts          # Interface for DI
├── infra/externalApis/
│   ├── BaseExternalApiClient.ts         # Abstract base class
│   ├── index.ts
│   └── mercadoLivre/
│       ├── MercadoLivreClient.ts        # Implementation
│       ├── MercadoLivreProviderImpl.ts   # Adapter for DI
│       ├── types.ts                     # Mercado Livre types
│       └── index.ts
└── shared/errors/
    └── ExternalApiError.ts              # Custom exceptions
```

## Setup

### 1. Install axios (if not already installed)
```bash
npm install axios
```

### 2. Configure Environment Variables

Add to your `.env`:
```env
MERCADO_LIVRE_CLIENT_ID=your_client_id
MERCADO_LIVRE_CLIENT_SECRET=your_client_secret
MERCADO_LIVRE_REDIRECT_URI=your_redirect_uri
MERCADO_LIVRE_ACCESS_TOKEN=your_access_token
```

### 3. Initialize in Your App

In `src/app.ts` or your dependency injection setup:

```typescript
import { MercadoLivreProviderImpl } from '@/infra/externalApis';

// Instantiate the provider
const mercadoLivreProvider = new MercadoLivreProviderImpl({
  clientId: process.env.MERCADO_LIVRE_CLIENT_ID!,
  clientSecret: process.env.MERCADO_LIVRE_CLIENT_SECRET!,
  redirectUri: process.env.MERCADO_LIVRE_REDIRECT_URI!,
  accessToken: process.env.MERCADO_LIVRE_ACCESS_TOKEN!,
});

// Register in your DI container or pass to use cases
app.register(mercadoLivreProvider);
```

## Usage Examples

### Search Products

```typescript
const results = await mercadoLivreProvider.searchProducts({
  q: 'laptop',
  limit: 50,
  offset: 0,
  sort: 'price_asc',
});

console.log(results.paging.total); // Total items found
results.results.forEach(product => {
  console.log(`${product.title}: R$ ${product.price}`);
});
```

### Get Product Details

```typescript
try {
  const product = await mercadoLivreProvider.getProductById('MLB123456789');
  console.log(product.title);
  console.log(product.available_quantity);
} catch (error) {
  if (error instanceof ExternalApiNotFoundError) {
    console.log('Product not found');
  }
}
```

### Get Seller Information

```typescript
const seller = await mercadoLivreProvider.getSellerInfo(123456);
console.log(seller.nickname);
console.log(seller.status.power_seller_status);
```

### Get Products by Category

```typescript
const products = await mercadoLivreProvider.getProductsByCategory(
  'MLB5672', // Category ID
  50,        // Limit
  0          // Offset
);
```

### Get Seller's Listings

```typescript
const listings = await mercadoLivreProvider.getSellerListings(
  123456, // Seller ID
  50,     // Limit
  0       // Offset
);
```

## Error Handling

The layer includes specialized error handling:

```typescript
import {
  ExternalApiError,
  ExternalApiAuthError,
  ExternalApiRateLimitError,
  ExternalApiNotFoundError,
} from '@/shared/errors/ExternalApiError';

try {
  await mercadoLivreProvider.searchProducts({ q: 'test' });
} catch (error) {
  if (error instanceof ExternalApiAuthError) {
    console.log('Authentication failed - refresh token');
    mercadoLivreProvider.updateAccessToken(newToken);
  } else if (error instanceof ExternalApiRateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof ExternalApiNotFoundError) {
    console.log('Resource not found');
  } else if (error instanceof ExternalApiError) {
    console.log(`Error: ${error.statusCode} - ${error.message}`);
  }
}
```

## Adding New External APIs (e.g., Shopee)

1. Create a new folder under `src/infra/externalApis/shopee/`
2. Create `types.ts` with Shopee-specific types
3. Create `ShopeeClient.ts` extending `BaseExternalApiClient`
4. Create `ShopeeProviderImpl.ts` implementing the port interface
5. Create the port in `src/application/ports/shopeeProvider.ts`

Example:

```typescript
// src/infra/externalApis/shopee/ShopeeClient.ts
import { BaseExternalApiClient } from '../BaseExternalApiClient';

export class ShopeeClient extends BaseExternalApiClient {
  constructor(apiKey: string, apiSecret: string) {
    super(
      { baseURL: 'https://partner.shopeemx.com/api/v1' },
      'Shopee',
      { 'X-API-Key': apiKey }
    );
  }

  async getShopProducts(shopId: number) {
    return this.get(`/shop/${shopId}/products`);
  }

  // ... other methods
}
```

## Key Features

✅ **Centralized Error Handling** - All HTTP errors mapped to domain-specific exceptions
✅ **Reusable Base Class** - Extend for new APIs without duplicating HTTP logic
✅ **Clean Architecture** - Follows your existing DI pattern with ports
✅ **Type Safety** - Comprehensive TypeScript types for Mercado Livre API
✅ **Token Management** - Easy token refresh without recreating client
✅ **Axios Integration** - Industry-standard HTTP client with interceptors support

## Next Steps

1. Update `env.ts` to export Mercado Livre config
2. Register `MercadoLivreProviderImpl` in your dependency injection container
3. Create use cases that depend on `MercadoLivreProvider`
4. When ready to add Shopee, following the same pattern
