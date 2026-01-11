import { DomainValidationError } from '../errors/domainValidationError';

export class Email {
  private constructor(private readonly value: string) {}

  public static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();

    // Pragmatic validation (not RFC-perfect, good enough for product invariants)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      throw new DomainValidationError('Invalid email');
    }

    return new Email(normalized);
  }

  public toString(): string {
    return this.value;
  }
}
