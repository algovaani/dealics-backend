import { Router, Request, Response, NextFunction } from "express";
import { login, register, forgotPassword, resetPassword, socialRegister } from "../controllers/auth.controller.js";
import { uploadProfile } from "../utils/fileUpload.js";

const router = Router();

// CORS middleware for auth routes
const authCorsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};

// Apply CORS middleware to all auth routes
router.use(authCorsMiddleware);

router.post("/login", login);
router.post("/register", uploadProfile.single('profile_image'), register);
router.post("/social-register", socialRegister);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;


