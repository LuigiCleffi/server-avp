export class ExternalApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly externalServiceName: string,
    public readonly originalError?: unknown,
    message?: string
  ) {
    super(message || `Error from ${externalServiceName}`);
    this.name = 'ExternalApiError';
    Object.setPrototypeOf(this, ExternalApiError.prototype);
  }
}

export class ExternalApiAuthError extends ExternalApiError {
  constructor(
    externalServiceName: string,
    originalError?: unknown,
    message?: string
  ) {
    super(401, externalServiceName, originalError, message || `Authentication failed with ${externalServiceName}`);
    this.name = 'ExternalApiAuthError';
    Object.setPrototypeOf(this, ExternalApiAuthError.prototype);
  }
}

export class ExternalApiRateLimitError extends ExternalApiError {
  constructor(
    externalServiceName: string,
    public readonly retryAfter?: number,
    originalError?: unknown,
    message?: string
  ) {
    super(429, externalServiceName, originalError, message || `Rate limit exceeded for ${externalServiceName}`);
    this.name = 'ExternalApiRateLimitError';
    Object.setPrototypeOf(this, ExternalApiRateLimitError.prototype);
  }
}

export class ExternalApiNotFoundError extends ExternalApiError {
  constructor(
    externalServiceName: string,
    originalError?: unknown,
    message?: string
  ) {
    super(404, externalServiceName, originalError, message || `Resource not found in ${externalServiceName}`);
    this.name = 'ExternalApiNotFoundError';
    Object.setPrototypeOf(this, ExternalApiNotFoundError.prototype);
  }
}
