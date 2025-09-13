import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

export interface JWTDecoded {
  user_id?: number;
  sub?: number;
  id?: number;
  userId?: number;
}

/**
 * Common utility function to decode JWT token from request headers
 * @param req Express Request object
 * @param res Express Response object
 * @returns Object with success status, userId, and error message if any
 */
export const decodeJWTToken = (req: Request, res: Response): {
  success: boolean;
  userId?: number;
  error?: string;
} => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return {
        success: false,
        error: 'Authorization token is required'
      };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    const userId = decoded.user_id || decoded.sub || decoded.id || decoded.userId;

    if (!userId) {
      return {
        success: false,
        error: 'Valid user ID is required'
      };
    }

    return {
      success: true,
      userId: userId
    };

  } catch (error: any) {
    console.error('JWT Token decode error:', error);
    return {
      success: false,
      error: 'Invalid or expired token'
    };
  }
};

/**
 * Middleware function to extract and validate JWT token
 * Adds userId to request object for use in controllers
 */
export const jwtAuthMiddleware = (req: Request, res: Response, next: Function) => {
  const result = decodeJWTToken(req, res);
  
  if (!result.success) {
    return res.status(401).json({
      status: false,
      message: result.error,
      data: []
    });
  }

  // Add userId to request object for use in controllers
  (req as any).userId = result.userId;
  next();
};
