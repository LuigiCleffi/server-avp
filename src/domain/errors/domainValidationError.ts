export class DomainValidationError extends Error {
  public readonly code = 'DOMAIN_VALIDATION_ERROR';
  public readonly details?: object;

  constructor(message: string, details?: object) {
    super(message);
    this.name = 'DomainValidationError';
    this.details = details;
  }
}
