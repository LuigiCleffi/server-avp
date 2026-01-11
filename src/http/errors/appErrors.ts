export type AppErrorOptions = {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
  cause?: unknown;
};

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor({ code, message, statusCode, details, cause }: AppErrorOptions) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Preserve cause for logging without exposing it in responses
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).cause = cause;
  }
}

export class DomainError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ code: 'DOMAIN_ERROR', message, statusCode: 422, details });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ code: 'CONFLICT', message, statusCode: 409, details });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ code: 'NOT_FOUND', message, statusCode: 404, details });
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super({ code: 'UNAUTHORIZED', message, statusCode: 401, details });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: unknown) {
    super({ code: 'FORBIDDEN', message, statusCode: 403, details });
  }
}
