import { Request, Response, NextFunction } from "express";

// Middleware to set no-cache headers for all API responses
export function noCache(req: Request, res: Response, next: NextFunction) {
  // Set no-cache headers
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'ETag': `"api-${Date.now()}"`,
    'Last-Modified': new Date().toUTCString()
  });
  
  next();
}
