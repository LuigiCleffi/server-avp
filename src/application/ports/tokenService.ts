export type AccessToken = string;

export type TokenPayload = {
  sub: string;
  role: string;
};

export interface TokenService {
  signAccessToken(payload: TokenPayload, expiresInSeconds: number): Promise<AccessToken>;
  verifyAccessToken(token: AccessToken): Promise<TokenPayload>;
}
