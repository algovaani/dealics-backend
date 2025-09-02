import { Request, Response } from "express";
import { CategoryField } from "../models/categoryField.model.js";

// Helper function to send standardized API responses
const sendApiResponse = (res: Response, statusCode: number, status: boolean, message: string, data?: any) => {
  return res.status(statusCode).json({
    status,
    message,
    data: data || []
  });
};

export const getCategoryFields = async (req: Request, res: Response) => {
  try {
    const categoryId = req.query.category_id;
    let fields;
    
    if (categoryId) {
      const catIdNum = Array.isArray(categoryId) ? Number(categoryId[0]) : Number(categoryId);
      fields = await CategoryField.findAll({ where: { category_id: catIdNum } });
    } else {
      fields = await CategoryField.findAll();
    }
    
    return sendApiResponse(res, 200, true, "Category fields retrieved successfully", fields);
  } catch (error: any) {
    console.error("Error getting category fields:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};
