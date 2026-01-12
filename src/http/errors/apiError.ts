export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: object;
  };
};

export function apiError(code: string, message: string, details?: object): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  };
}
