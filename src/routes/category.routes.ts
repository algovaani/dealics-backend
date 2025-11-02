import { Router } from "express";
import { getCategories, getCategory, updateCategory} from "../controllers/categories.controller.js";
import { getUsersGroupedByCategories } from "../controllers/user.controller.js";

const router = Router();

// Get users grouped by categories (public, no authentication required)
// This route MUST be before /:id to avoid route conflicts
router.get("/sellers-by-category", getUsersGroupedByCategories);

router.get("/", getCategories);
router.get("/:id", getCategory);
// router.post("/", createCategory);
router.put("/:id", updateCategory);
// router.delete("/:id", deleteCategory);

export default router;