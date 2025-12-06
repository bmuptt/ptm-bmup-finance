import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ResponseError } from '../config/response-error';
import apmAgent from '../config/apm';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check if response has already been sent
  if (res.headersSent) {
    // If headers already sent, just pass to Express default error handler
    return next(error);
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const dataError = error.issues.map((issue) => issue.message);

    // Capture error in APM
    if (apmAgent) {
      apmAgent.captureError(error, {
        request: req,
        custom: {
          validationErrors: dataError,
        },
      });
    }

    res.status(400).json({
      success: false,
      errors: dataError,
    });
    return;
  }

  // Handle custom ResponseError
  if (error instanceof ResponseError) {
    // Log error for debugging

    // Capture error in APM (only for 500 errors and 403)
    if (apmAgent && (error.status >= 500 || error.status === 403)) {
      apmAgent.captureError(error, {
        request: req,
        custom: {
          statusCode: error.status,
          messages: error.messages,
          url: req.url,
          method: req.method,
        },
      });
    }

    // Send error response
    res.status(error.status).json({
      success: false,
      errors: error.messages,
    });
    return;
  }

  // Handle generic errors
  const statusCode = (error as AppError).statusCode || 500;
  const message = error.message || 'Internal server error';

  // Capture error in APM
  if (apmAgent) {
    apmAgent.captureError(error, {
      request: req,
      custom: {
        statusCode,
        url: req.url,
        method: req.method,
        ip: req.ip,
      },
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
};
