import { Request, Response } from "express";
import { Block } from "../models/block.model.js";
import { sendApiResponse } from "../utils/apiResponse.js";

// GET /api/blocks/:alias - public, no auth
export const getBlockByAlias = async (req: Request, res: Response) => {
  try {
    const { alias } = req.params;
    if (!alias || typeof alias !== 'string' || alias.trim() === '') {
      return sendApiResponse(res, 400, false, "Valid alias is required", []);
    }

    const block = await Block.findOne({ where: { alias } });
    if (!block) {
      return sendApiResponse(res, 404, false, "Block not found", []);
    }

    return sendApiResponse(res, 200, true, "Block retrieved successfully", {
      id: block.id,
      title: block.title || null,
      alias: block.alias || null,
      description: block.description || null,
      created_at: (block as any).created_at || null,
      updated_at: (block as any).updated_at || null,
    });
  } catch (error: any) {
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};


