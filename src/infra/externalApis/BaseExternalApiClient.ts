import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import {
  ExternalApiError,
  ExternalApiAuthError,
  ExternalApiRateLimitError,
  ExternalApiNotFoundError,
} from '@/shared/errors/ExternalApiError';

export interface ExternalApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Abstract base class for external API clients.
 * Provides common HTTP methods and error handling for different external services.
 */
export abstract class BaseExternalApiClient {
  protected axiosInstance: AxiosInstance;
  protected readonly serviceName: string;

  constructor(config: ExternalApiClientConfig, serviceName: string, additionalHeaders?: Record<string, string>) {
    this.serviceName = serviceName;

    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
        ...additionalHeaders,
      },
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  /**
   * Centralized error handling for all external API calls
   */
  protected handleError(error: AxiosError | Error): never {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;

      switch (statusCode) {
        case 401:
        case 403:
          throw new ExternalApiAuthError(this.serviceName, error, error.response?.data?.toString());

        case 429:
          throw new ExternalApiRateLimitError(
            this.serviceName,
            parseInt(error.response?.headers['retry-after'] || '60'),
            error
          );

        case 404:
          throw new ExternalApiNotFoundError(
            this.serviceName,
            error,
            error.response?.data?.toString()
          );

        default:
          throw new ExternalApiError(
            statusCode,
            this.serviceName,
            error,
            error.response?.data?.toString()
          );
      }
    }

    // Non-axios error
    throw new ExternalApiError(500, this.serviceName, error, error instanceof Error ? error.message : 'Unknown error');
  }

  /**
   * Make a GET request to the external API
   */
  protected async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.get<T>(path, config);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError | Error);
    }
  }

  /**
   * Make a POST request to the external API
   */
  protected async post<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.post<T>(path, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError | Error);
    }
  }

  /**
   * Make a PUT request to the external API
   */
  protected async put<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.put<T>(path, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError | Error);
    }
  }

  /**
   * Make a PATCH request to the external API
   */
  protected async patch<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.patch<T>(path, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError | Error);
    }
  }

  /**
   * Make a DELETE request to the external API
   */
  protected async delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.delete<T>(path, config);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError | Error);
    }
  }
}
