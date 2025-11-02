import { Request, Response } from "express";
import { CategoryService } from "../services/categories.service.js";

const categoriesService = new CategoryService();

// Helper function to send standardized API responses
const sendApiResponse = (res: Response, statusCode: number, status: boolean, message: string, data?: any, pagination?: any) => {
  const response: any = {
    status,
    message,
    data: data || []
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    // Get pagination parameters
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const perPage = req.query.perPage ? parseInt(String(req.query.perPage)) : 10;

    const result = await categoriesService.getAllCategories(page, perPage);
    
    if (result.success) {
      return sendApiResponse(res, 200, true, "Categories retrieved successfully", result.data.categories, result.data.pagination);
    } else {
      return sendApiResponse(res, 400, false, "Failed to get categories", []);
    }
  } catch (error: any) {
    console.error("Error getting categories:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

export const getCategory = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    
    // Early validation - check if param is a valid number string before converting
    if (!idParam || idParam.trim() === '' || isNaN(Number(idParam)) || Number(idParam) <= 0) {
      return sendApiResponse(res, 400, false, "Invalid category ID", []);
    }
    
    const id = parseInt(idParam, 10);
    
    // Double check after conversion
    if (isNaN(id) || id <= 0) {
      return sendApiResponse(res, 400, false, "Invalid category ID", []);
    }
    
    const category = await categoriesService.getCategoryById(id);
    if (!category) {
      return sendApiResponse(res, 404, false, "Category not found", []);
    }
    return sendApiResponse(res, 200, true, "Category retrieved successfully", [category]);
  } catch (error: any) {
    console.error("Error getting category:", error);
    // Check if error is related to NaN
    if (error.message && error.message.includes('NaN')) {
      return sendApiResponse(res, 400, false, "Invalid category ID - NaN detected", []);
    }
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
