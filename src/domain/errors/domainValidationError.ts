export class DomainValidationError extends Error {
  public readonly code = 'DOMAIN_VALIDATION_ERROR';
  public readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'DomainValidationError';
    this.details = details;
  }
}
