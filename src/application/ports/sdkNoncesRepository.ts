export type NonceCreateResult =
  | { created: true }
  | { created: false; reason: 'DUPLICATE' };

export interface SdkNoncesRepository {
  createOnce(input: { apiKeyId: string; nonce: string }): Promise<NonceCreateResult>;
}
