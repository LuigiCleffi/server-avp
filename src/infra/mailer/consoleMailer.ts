import type { Mailer, SendPasswordResetEmailInput } from '@/application/ports/mailer';

export class ConsoleMailer implements Mailer {
  async sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void> {
    // Placeholder for real email provider integration.
    // Intentionally logs only in dev environments.
    // Avoid logging tokens in production.
    // eslint-disable-next-line no-console
    console.info('[Mailer] Password reset email', {
      to: input.to,
      token: input.token,
      expiresAt: input.expiresAt.toISOString(),
    });
  }
}
