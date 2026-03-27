/**
 * Mercado Livre API Types
 */

export interface MercadoLivreOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken: string;
}

export interface MercadoLivreAuthorizationUrlParams {
  state?: string;
}

export interface MercadoLivreTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  user_id?: number;
  refresh_token: string;
}

export interface MercadoLivreOrderSearchParams {
  sellerId: string | number;
  orderStatus?: string;
  offset?: number;
  limit?: number;
  sort?: 'date_desc' | 'date_asc';
}

export interface MercadoLivreOrderItem {
  item: {
    id: string;
    title?: string;
    seller_sku?: string;
  };
  quantity: number;
  unit_price: number;
  full_unit_price?: number;
}

export interface MercadoLivreOrder {
  id: number;
  status: string;
  date_created: string;
  date_closed?: string;
  total_amount: number;
  currency_id: string;
  shipping?: {
    id?: number;
  };
  pack_id?: number;
  order_items: MercadoLivreOrderItem[];
}

export interface MercadoLivreOrderSearchResult {
  query?: string;
  results: MercadoLivreOrder[];
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
}

export interface MercadoLivreBillingInfo {
  doc_type?: string;
  transaction_status?: string;
  status?: string;
  message?: string;
  details?: unknown;
}

export interface MercadoLivreFiscalDocumentFile {
  id?: string;
  type?: string;
  url?: string;
  file_name?: string;
}

export interface MercadoLivrePackFiscalDocuments {
  pack_id?: number;
  fiscal_documents?: MercadoLivreFiscalDocumentFile[];
  documents?: MercadoLivreFiscalDocumentFile[];
}

export interface MercadoLivreWebhookNotification {
  resource: string;
  user_id: number;
  topic: string;
  application_id: number;
  attempts: number;
  sent: string;
  received: string;
}

export interface MercadoLivreProduct {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  sold_quantity: number;
  condition: 'new' | 'used';
  permalink: string;
  thumbnail: string;
  category_id: string;
  seller_id: string;
  listing_type_id: string;
}

export interface MercadoLivreSearchParams {
  q?: string;
  category?: string;
  limit?: number;
  offset?: number;
  sort?: 'price_asc' | 'price_desc' | 'relevance' | 'sold_quantity_desc' | 'new_asc' | 'new_desc';
}

export interface MercadoLivreSearchResult {
  site_id: string;
  country_default_time_zone: string;
  query: string;
  paging: {
    total: number;
    offset: number;
    limit: number;
    primary_results: number;
  };
  results: MercadoLivreProduct[];
}

export interface MercadoLivreSeller {
  id: number;
  nickname: string;
  email: string;
  status: {
    level_id: string;
    power_seller_status: string;
    risk_classification: string;
    transactions: {
      period: string;
      total: number;
      completed: number;
      ratings: {
        positive: number;
        negative: number;
        neutral: number;
      };
    };
  };
  site_id: string;
  created_at: string;
}

export interface MercadoLivreCategory {
  id: string;
  name: string;
  permalink: string;
  total_items_in_this_category: number;
  picture?: string;
  attribute_types: string[];
  settings: {
    picture: boolean;
    listing: boolean;
    variation_attribute_mapping: unknown[];
    stock: boolean;
    immediate_payment: string;
  };
  channels_settings: unknown[];
  meta_categ_id?: string;
  attribute_publication_rules: unknown[];
}

export interface MercadoLivreItem {
  id: string;
  title: string;
  subtitle?: string;
  seller_id: number;
  category_id: string;
  official_store_id?: number;
  price: number;
  base_price: number;
  original_price?: number;
  currency_id: string;
  initial_quantity: number;
  available_quantity: number;
  sold_quantity: number;
  buying_mode: string;
  listing_type_id: string;
  condition: string;
  permalink: string;
  thumbnail: string;
  pictures: {
    id: string;
    url: string;
    secure_url: string;
  }[];
  descriptions: unknown[];
  accepts_mercadopago: boolean;
  status: string;
  warranty?: string;
  catalog_product_id?: string;
  domain_id?: string;
  parent_item_id?: string;
  differential_pricing?: unknown;
  deal_ids?: string[];
  automatic_relist?: boolean;
  date_created: string;
  last_updated: string;
  health?: number;
  catalog_listing?: boolean;
}

export interface MercadoLivreUser {
  id: number;
  nickname: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: {
    country_code?: string;
    area_code?: string;
    number: string;
  };
  address?: {
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country_id?: string;
  };
  user_type: string;
  tags?: string[];
  logo?: string;
  points?: number;
  site_id: string;
  permalink?: string;
  registration_date: string;
  professional_seller_category?: string;
  seller_reputation?: {
    level_id: string;
    power_seller_status: string;
    transactions: number;
    metrics: {
      sales: number;
      cancellations: number;
      ratings: number;
    };
  };
  buyer_reputation?: {
    canceled_transactions: number;
    tags: string[];
  };
}

export interface MercadoLivreApiError {
  error: number;
  message: string;
  status: number;
  cause?: Array<{
    code: number;
    message: string;
  }>;
}
