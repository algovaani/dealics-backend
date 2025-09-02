import { Request, Response } from "express";
import { CategoryService } from "../services/categories.service.js";

const categoriesService = new CategoryService();

// Helper function to send standardized API responses
const sendApiResponse = (res: Response, statusCode: number, status: boolean, message: string, data?: any) => {
  return res.status(statusCode).json({
    status,
    message,
    data: data || []
  });
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await categoriesService.getAllCategories();
    return sendApiResponse(res, 200, true, "Categories retrieved successfully", categories);
  } catch (error: any) {
    console.error("Error getting categories:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

export const getCategory = async (req: Request, res: Response) => {
  try {
    const category = await categoriesService.getCategoryById(Number(req.params.id));
    if (!category) {
      return sendApiResponse(res, 404, false, "Category not found", []);
    }
    return sendApiResponse(res, 200, true, "Category retrieved successfully", [category]);
  } catch (error: any) {
    console.error("Error getting category:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// export const createCategory = async (req: Request, res: Response) => {
//   const { name, description } = req.body;
//   const category = await categoriesService.createCategory(name, description);
//   res.status(201).json(category);
// };

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendApiResponse(res, 400, false, "Invalid ID", []);
    }
    
    const category = await categoriesService.updateCategory(id, req.body);
    if (!category) {
      return sendApiResponse(res, 404, false, "Category not found", []);
    }
    return sendApiResponse(res, 200, true, "Category updated successfully", [category]);
  } catch (error: any) {
    console.error("Error updating category:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// export const deleteCategory = async (req: Request, res: Response) => {
//   const success = await categoriesService.deleteCategory(Number(req.params.id));
//   if (!success) return res.status(404).json({ message: "Category not found" });
//   res.json({ message: "Category deleted" });
// };
