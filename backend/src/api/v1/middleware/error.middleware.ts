import { Request, Response, NextFunction } from 'express';

/**
 * Custom Error Classes
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * Global Error Handler Middleware
 * 
 * Catches all errors and formats them consistently
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  // Handle known AppError instances
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        status: error.statusCode
      }
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      status: 500
    }
  });
};