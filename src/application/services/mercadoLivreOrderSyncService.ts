import type {
  MercadoLivreOrderRecord,
  MercadoLivreOrdersRepository,
} from '@/application/ports/mercadoLivreOrdersRepository';
import { MercadoLivreTokenService } from '@/application/services/mercadoLivreTokenService';
import {
  MercadoLivreProviderImpl,
  type MercadoLivreBillingInfo,
  type MercadoLivreOrder,
  type MercadoLivrePackFiscalDocuments,
  type MercadoLivreWebhookNotification,
} from '@/infra/externalApis';
import { env } from '@/env';
import { ExternalApiNotFoundError } from '@/shared/errors/ExternalApiError';

export type SyncMercadoLivreOrdersInput = {
  sellerId: string;
  orderStatus?: string;
  limit?: number;
  offset?: number;
};

export type SyncedMercadoLivreOrder = {
  orderId: string;
  sellerId: string;
  status: string;
  totalAmount: string;
  shippingId: string | null;
  packId: string | null;
  nfeStatus: string;
  updatedAt: string;
};

export type SyncMercadoLivreOrdersResult = {
  sellerId: string;
  totalRemote: number;
  syncedCount: number;
  orders: SyncedMercadoLivreOrder[];
};

export type ProcessMercadoLivreWebhookResult = {
  status: 'processed' | 'ignored';
  topic: string;
  sellerId: string;
  orderId: string | null;
};

export type ListStoredMercadoLivreOrdersResult = {
  sellerId: string;
  orders: SyncedMercadoLivreOrder[];
};

export class MercadoLivreOrderSyncService {
  constructor(
    private readonly tokenService: MercadoLivreTokenService,
    private readonly ordersRepository: MercadoLivreOrdersRepository,
  ) {}

  async syncRecentOrders(input: SyncMercadoLivreOrdersInput): Promise<SyncMercadoLivreOrdersResult> {
    const provider = await this.createProvider(input.sellerId);
    const result = await provider.listOrders({
      sellerId: input.sellerId,
      orderStatus: input.orderStatus,
      limit: input.limit,
      offset: input.offset,
    });

    const orders: SyncedMercadoLivreOrder[] = [];
    for (const remoteOrder of result.results) {
      const saved = await this.persistOrder(input.sellerId, remoteOrder, provider);
      orders.push(this.toSummary(saved));
    }

    return {
      sellerId: input.sellerId,
      totalRemote: result.paging.total,
      syncedCount: orders.length,
      orders,
    };
  }

  async processWebhook(notification: MercadoLivreWebhookNotification): Promise<ProcessMercadoLivreWebhookResult> {
    const sellerId = String(notification.user_id);
    if (notification.topic !== 'orders_v2') {
      return {
        status: 'ignored',
        topic: notification.topic,
        sellerId,
        orderId: null,
      };
    }

    const provider = await this.createProvider(sellerId);
    const order = await provider.getResource<MercadoLivreOrder>(
      this.normalizeResourcePath(notification.resource),
    );
    const saved = await this.persistOrder(sellerId, order, provider);

    return {
      status: 'processed',
      topic: notification.topic,
      sellerId,
      orderId: saved.orderId,
    };
  }

  async listStoredOrders(sellerId: string, limit?: number, offset?: number): Promise<ListStoredMercadoLivreOrdersResult> {
    const orders = await this.ordersRepository.listBySellerId({
      sellerId,
      limit,
      offset,
    });

    return {
      sellerId,
      orders: orders.map((order) => this.toSummary(order)),
    };
  }

  private async createProvider(sellerId: string): Promise<MercadoLivreProviderImpl> {
    const accessToken = await this.tokenService.getValidAccessToken(sellerId);

    return new MercadoLivreProviderImpl({
      clientId: env.mercadoLivreClientId,
      clientSecret: env.mercadoLivreClientSecret,
      redirectUri: env.mercadoLivreRedirectUri,
      accessToken,
    });
  }

  private async persistOrder(
    sellerId: string,
    order: MercadoLivreOrder,
    provider: MercadoLivreProviderImpl,
  ): Promise<MercadoLivreOrderRecord> {
    const billingInfo = await this.safeGetBillingInfo(provider, order.id);
    const fiscalDocuments = order.pack_id
      ? await this.safeGetPackFiscalDocuments(provider, order.pack_id)
      : null;

    return this.ordersRepository.save({
      orderId: String(order.id),
      sellerId,
      status: order.status,
      totalAmount: order.total_amount.toFixed(2),
      items: this.toJsonSafeValue(order.order_items),
      shippingId: order.shipping?.id ? String(order.shipping.id) : null,
      packId: order.pack_id ? String(order.pack_id) : null,
      nfeStatus: this.resolveNfeStatus(order, billingInfo, fiscalDocuments),
      rawPayload: this.toJsonSafeValue({
        order,
        billingInfo,
        fiscalDocuments,
      }),
    });
  }

  private async safeGetBillingInfo(
    provider: MercadoLivreProviderImpl,
    orderId: string | number,
  ): Promise<MercadoLivreBillingInfo | null> {
    try {
      return await provider.getOrderBillingInfo(orderId);
    } catch (error) {
      if (error instanceof ExternalApiNotFoundError) {
        return null;
      }

      throw error;
    }
  }

  private async safeGetPackFiscalDocuments(
    provider: MercadoLivreProviderImpl,
    packId: string | number,
  ): Promise<MercadoLivrePackFiscalDocuments | null> {
    try {
      return await provider.getPackFiscalDocuments(packId);
    } catch (error) {
      if (error instanceof ExternalApiNotFoundError) {
        return null;
      }

      throw error;
    }
  }

  private resolveNfeStatus(
    order: MercadoLivreOrder,
    billingInfo: MercadoLivreBillingInfo | null,
    fiscalDocuments: MercadoLivrePackFiscalDocuments | null,
  ): string {
    const documents = fiscalDocuments?.fiscal_documents ?? fiscalDocuments?.documents ?? [];
    if (documents.length > 0) {
      return 'available';
    }

    if (billingInfo?.status && billingInfo.status.trim().length > 0) {
      return billingInfo.status;
    }

    if (billingInfo?.transaction_status && billingInfo.transaction_status.trim().length > 0) {
      return billingInfo.transaction_status;
    }

    if (order.pack_id) {
      return 'pending';
    }

    return 'not_available';
  }

  private normalizeResourcePath(resource: string): string {
    if (/^https?:\/\//.test(resource)) {
      const url = new URL(resource);
      return `${url.pathname}${url.search}`;
    }

    return resource.startsWith('/') ? resource : `/${resource}`;
  }

  private toSummary(order: MercadoLivreOrderRecord): SyncedMercadoLivreOrder {
    return {
      orderId: order.orderId,
      sellerId: order.sellerId,
      status: order.status,
      totalAmount: order.totalAmount,
      shippingId: order.shippingId,
      packId: order.packId,
      nfeStatus: order.nfeStatus,
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private toJsonSafeValue(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value ?? null));
  }
}
