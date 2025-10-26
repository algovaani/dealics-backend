import { Request, Response } from "express";
import { Slider } from "../models/slider.model.js";

// Helper function to send standardized API responses
const sendApiResponse = (res: Response, statusCode: number, status: boolean, message: string, data?: any) => {
  return res.status(statusCode).json({
    status,
    message,
    data: data || []
  });
};

export const getActiveSliders = async (req: Request, res: Response) => {
  try {
    const sliders = await Slider.findAll({ where: { status: 1 } });
    return sendApiResponse(res, 200, true, "Active sliders retrieved successfully", sliders);
  } catch (error: any) {
    console.error("Error getting active sliders:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};
