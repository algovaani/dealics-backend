import { Router } from "express";
import { login, register, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import { uploadProfile } from "../utils/fileUpload.js";

const router = Router();

router.post("/login", login);
router.post("/register", uploadProfile.single('profile_image'), register);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;


