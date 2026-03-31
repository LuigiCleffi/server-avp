export type MercadoLivreOrderRecord = {
  orderId: string;
  sellerId: string;
  status: string;
  totalAmount: string;
  items: unknown;
  shippingId: string | null;
  packId: string | null;
  nfeStatus: string;
  rawPayload: unknown | null;
  updatedAt: Date;
  createdAt: Date;
};

export type SaveMercadoLivreOrderInput = {
  orderId: string;
  sellerId: string;
  status: string;
  totalAmount: string;
  items: unknown;
  shippingId?: string | null;
  packId?: string | null;
  nfeStatus: string;
  rawPayload?: unknown | null;
};

export type ListMercadoLivreOrdersInput = {
  sellerId: string;
  limit?: number;
  offset?: number;
};

export interface MercadoLivreOrdersRepository {
  findByOrderId(orderId: string): Promise<MercadoLivreOrderRecord | null>;
  listBySellerId(input: ListMercadoLivreOrdersInput): Promise<MercadoLivreOrderRecord[]>;
  save(input: SaveMercadoLivreOrderInput): Promise<MercadoLivreOrderRecord>;
}
