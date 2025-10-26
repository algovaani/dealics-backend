import { Router } from "express";
import { getUserProfile, getUserById, updateUser, deleteUser } from "../controllers/user.controller.js";
const router = Router();
// Public profile API (no authentication required)
router.get("/profile/:userId", getUserProfile);
// Other user routes
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
export default router;
//# sourceMappingURL=user.routes.js.map