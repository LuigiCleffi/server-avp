export type AppErrorOptions = {
  code: string;
  message: string;
  statusCode: number;
  details?: object;
  cause?: Error;
};

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: object;

  constructor({ code, message, statusCode, details, cause }: AppErrorOptions) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Preserve cause for logging without exposing it in responses
    if (cause) {
      this.cause = cause;
    }
  }
}

export class DomainError extends AppError {
  constructor(message: string, details?: object) {
    super({ code: 'DOMAIN_ERROR', message, statusCode: 422, details });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: object) {
    super({ code: 'CONFLICT', message, statusCode: 409, details });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: object) {
    super({ code: 'NOT_FOUND', message, statusCode: 404, details });
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthorized', details?: object) {
    super({ code: 'UNAUTHORIZED', message, statusCode: 401, details });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: object) {
    super({ code: 'FORBIDDEN', message, statusCode: 403, details });
  }
}
