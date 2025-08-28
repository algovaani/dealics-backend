import { Router } from "express";
import { getCategories, getCategory, updateCategory} from "../controllers/categories.controller.js";

const router = Router();

router.get("/", getCategories);
router.get("/:id", getCategory);
// router.post("/", createCategory);
router.put("/:id", updateCategory);
// router.delete("/:id", deleteCategory);

export default router;