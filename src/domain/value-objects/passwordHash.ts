import { DomainValidationError } from '../errors/domainValidationError';

export class PasswordHash {
  private constructor(private readonly value: string) {}

  public static create(raw: string): PasswordHash {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new DomainValidationError('Password hash is required');
    }

    return new PasswordHash(trimmed);
  }

  public toString(): string {
    return this.value;
  }
}
