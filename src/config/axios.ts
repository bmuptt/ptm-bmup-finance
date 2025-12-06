import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { config } from './environment';
import { ResponseError } from './response-error';
import apmAgent from './apm';

// Create axios instance with default configuration
const createAxiosInstance = (baseURL?: string): AxiosInstance => {
  const config: {
    timeout: number;
    headers: {
      'Content-Type': string;
      'Accept': string;
    };
    baseURL?: string;
  } = {
    timeout: 30000, // 30 seconds timeout
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
  
  if (baseURL) {
    config.baseURL = baseURL;
  }
  
  const instance = axios.create(config);

  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      // Add timestamp to prevent caching
      config.params = {
        ...config.params,
        _t: Date.now(),
      };

      // Add APM trace context to headers for distributed tracing
      // This ensures external service calls are tracked as child spans with same trace ID
      // Elastic APM will automatically create spans for HTTP requests
      if (apmAgent && apmAgent.currentTransaction) {
        try {
          const transaction = apmAgent.currentTransaction();
          if (transaction && transaction.traceparent) {
            config.headers = config.headers || {};
            // Add traceparent header for distributed tracing
            config.headers['traceparent'] = transaction.traceparent;
            
            // Add tracestate if available
            if (transaction.tracestate) {
              config.headers['tracestate'] = transaction.tracestate;
            }
          }
        } catch (error) {
          // Silently fail if APM trace propagation fails (APM will handle errors internally)
        }
      }

      return config;
    },
    (error) => {
      // Only log actual errors, not validation errors
      return Promise.reject(error);
    }
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Remove verbose logging - APM will track this
      return response;
    },
    (error: AxiosError) => {
      const status = error.response?.status ?? 500;

      const data = error.response?.data as Record<string, unknown> | undefined;

      // Only log errors (not validation errors) - APM will track full details
      // console.error removed to reduce log volume in production

      let messages: string[] = [];

      if (data) {
        const errors = data.errors;
        if (Array.isArray(errors) && errors.length) {
          messages = errors.map((err) => String(err));
        } else if (typeof data.message === 'string' && data.message) {
          messages = [data.message];
        } else if (typeof data.error === 'string' && data.error) {
          messages = [data.error];
        }
      }

      if (!messages.length) {
        if (error.code === 'ECONNABORTED') {
          messages = ['External service timeout'];
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          messages = ['External service unreachable'];
        } else if (status === 404) {
          messages = ['External resource not found'];
        } else {
          messages = [error.message || 'External service error'];
        }
      }

      return Promise.reject(new ResponseError(status, messages));
    }
  );

  return instance;
};

// Create axios instance for core service
export const httpClient = createAxiosInstance(config.API_URL_CORE);

// Create custom axios instance for specific services
export const createHttpClient = (baseURL: string): AxiosInstance => {
  return createAxiosInstance(baseURL);
};

// Create axios instance without baseURL for flexible usage
export const createFlexibleHttpClient = (): AxiosInstance => {
  return createAxiosInstance();
};

// HTTP methods wrapper with error handling
export class HttpClient {
  private instance: AxiosInstance;

  constructor(baseURL?: string) {
    this.instance = createAxiosInstance(baseURL);
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.instance.get<T>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.instance.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.instance.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.instance.patch<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.instance.delete<T>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response) {
        // Server responded with error status
        return new Error(`HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`);
      } else if (axiosError.request) {
        // Request was made but no response received
        return new Error('Network error: No response from server');
      } else {
        // Something else happened
        return new Error(`Request error: ${axiosError.message}`);
      }
    }
    
    return error;
  }
}

// Export default HTTP client instance
export const defaultHttpClient = new HttpClient();

export default httpClient;
