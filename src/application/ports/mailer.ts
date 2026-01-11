export type SendPasswordResetEmailInput = {
  to: string;
  token: string;
  expiresAt: Date;
};

export interface Mailer {
  sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void>;
}
